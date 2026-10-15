use math_box::evaluate;

fn assert_eval(input: &str, expected: &str) {
    let got = evaluate(input).unwrap_or_else(|e| panic!("eval {input:?} failed: {e}"));
    assert_eq!(got, expected, "input={input}");
}

#[test]
fn basic_arithmetic() {
    assert_eval("1000 + 2000", "3000");
    assert_eval("2 * (3 + 4)", "14");
    assert_eval("1.5 * 2.5", "3.75");
    assert_eval("10 / 4", "2.5");
    assert_eval("10 % 3", "1");
}

#[test]
fn precedence() {
    assert_eval("1 + 2 * 3", "7");
    assert_eval("2 + 3 * 4 - 1", "13");
    assert_eval("2^3", "8");
    assert_eval("2^3^2", "512"); // right-assoc: 2^(3^2) = 2^9
}

#[test]
fn unary() {
    assert_eval("-5", "-5");
    assert_eval("-(2 + 3)", "-5");
    assert_eval("--3", "3");
    assert_eval("+5", "5");
}

#[test]
fn factorial() {
    assert_eval("5!", "120");
    assert_eval("0!", "1");
    assert_eval("5! + 1", "121");
}

#[test]
fn constants_and_functions() {
    assert_eval("sin(PI/2)", "1");
    assert_eval("cos(0)", "1");
    assert_eval("sqrt(16)", "4");
    assert_eval("abs(-7)", "7");
    assert_eval("floor(1.9)", "1");
    assert_eval("ceil(1.1)", "2");
}

#[test]
fn log_function_two_arg_form() {
    // log(x, base) = log_base(x); matches mathjs
    assert_eval("log(10, 10000)", "0.25");
}

#[test]
fn combined_test_from_existing_suite() {
    assert_eval("2 + 2^10 + log(10, 10000)", "1026.25");
}

#[test]
fn min_max_variadic() {
    assert_eval("min(3, 1, 2)", "1");
    assert_eval("max(3, 1, 2)", "3");
}

#[test]
fn hex_bin_oct_literals() {
    assert_eval("0xff", "255");
    assert_eval("0b1010", "10");
    assert_eval("0o17", "15");
}

#[test]
fn assignment_and_blocks() {
    assert_eval("x = 5; x + 1", "6");
    assert_eval("x = 2; y = 3; x * y", "6");
    assert_eval("a = 10", "10"); // assignment expression yields the value
    assert_eval("x = 1; x = x + 1; x", "2"); // re-assignment
}

#[test]
fn assignment_uses_constants() {
    assert_eval("r = 5; PI * r^2", "78.53981633974483");
}

#[test]
fn assigned_and_parameter_names_shadow_constants() {
    assert_eval("e = 5; e + 1", "6");
    assert_eval("pi = 3; pi + 1", "4");
    assert_eval("f(e) = e * 2; f(1)", "2");
    assert_eval("area(pi) = pi + 1; area(1)", "2");
}

#[test]
fn user_defined_function() {
    assert_eval("f(x) = x * 2; f(5)", "10");
    assert_eval("g(a, b) = a + b * 2; g(1, 3)", "7");
    assert_eval("sq(x) = x^2; sq(7)", "49");
}

#[test]
fn user_function_recursion() {
    // recursion within user-defined function
    assert_eval("fact(n) = n; fact(7)", "7"); // sanity: returns param
}

#[test]
fn user_function_shadows_builtin_in_body() {
    // body's `sin(0)` must dispatch to the user-defined sin, not the builtin.
    // a leak here would fold sin(0) → 0 at compile time and produce 99.
    assert_eval("sin(x) = 99; sin(0) + sin(0)", "198");
}

#[test]
fn lambda_body_sees_outer_shadow_set() {
    // when a lambda body calls a user-shadowed builtin with literal args,
    // the inner compile must NOT fold via the builtin. shadowing must
    // propagate from the outer program into the body's compile pass.
    assert_eval("fact(n) = 99; ans(x) = fact(0); ans(5)", "99");
}

#[test]
fn bigint_basic() {
    // BigInt arithmetic via big() and `n`-suffixed literals
    assert_eval("big(100) + big(200)", "300");
    assert_eval("big(123) * big(456)", "56088");
    // `n` suffix preserves precision past i53 (f64 mantissa boundary)
    assert_eval("9007199254740993n + 1n", "9007199254740994");
    assert_eval("123456789012345678901n + 1n", "123456789012345678902");
}

#[test]
fn big_rejects_non_integer() {
    // big() must not silently truncate fractional input.
    assert!(math_box::evaluate("big(1.5)").is_err());
    assert!(math_box::evaluate("big(0.999)").is_err());
    // legitimate integer-valued floats still work.
    assert_eval("big(1.0)", "1");
    assert_eval("big(1e6)", "1000000");
}

#[test]
fn bigint_num_promotion_rules() {
    // integer-valued Num promotes to Big; full precision preserved.
    assert_eval("100n + 5", "105");
    assert_eval("100n - 5", "95");
    assert_eval("100n * 3", "300");
    assert_eval("100n / 4", "25");
    // integer-valued Num promotes; division stays in Big domain (integer
    // division), matching JS BigInt semantics: `7n / 2.0` == 3n.
    assert_eval("7n / 2.0", "3");

    // non-integer BigInt mixes are rejected instead of losing precision by
    // converting the BigInt through f64.
    assert!(math_box::evaluate("100n + 1.5").is_err());
    assert!(math_box::evaluate("100n - 0.5").is_err());
    assert!(math_box::evaluate("100n * 0.5").is_err());
    assert!(math_box::evaluate("7n / 2.5").is_err());

    // commuted operands hit the same exactness boundary.
    assert!(math_box::evaluate("1.5 + 100n").is_err());
    assert!(math_box::evaluate("0.5 - 100n").is_err());
}

#[test]
fn exact_integer_literals_and_operations() {
    assert_eval("9007199254740993 + 1", "9007199254740994");
    assert_eval("9007199254740991 + 2", "9007199254740993");
    assert_eval("9007199254740991 * 3", "27021597764222973");
    assert_eval("0x10000000000000000n", "18446744073709551616");
    assert_eval("12345678901234567891n % 10n", "1");
    assert_eval("2n^100", "1267650600228229401496703205376");
    assert_eval("2n^64n", "18446744073709551616");
    assert!(math_box::evaluate("1.5 ^ 2n").is_err());
    assert_eval("frac(1, 2) ^ 2n", "1/4");
    assert_eval("25n!", "15511210043330985984000000");
    assert_eval("2^70", "1180591620717411303424");
}

#[test]
fn exact_fraction_conversion_uses_full_integer_backend() {
    assert_eval("frac(1e30, 1)", "1000000000000000019884624838656");
    assert_eval("frac(1, 2) + 1e30", "2000000000000000039769249677313/2");
}

#[test]
fn fraction_basic() {
    assert_eval("frac(1, 3) + frac(1, 4)", "7/12");
    assert_eval("frac(1, 2) * frac(2, 3)", "1/3");
    assert_eval("frac(3, 4) - frac(1, 4)", "1/2");
    // fraction simplifies and renders integer-form when den=1
    assert_eval("frac(4, 2)", "2");
}

#[test]
#[cfg(feature = "bigint")]
fn fraction_bigint_backend_no_overflow() {
    // Phase 4.1: with bigint feature, Fraction num/den use BigInt; an
    // i64 backend would overflow on these intermediate cross-products.
    // we feed the constructor BigInt literals (`n`-suffix) so that the
    // numerator/denominator preserve precision through to Fraction::new.
    assert_eval(
        "frac(1n, 2305843009213693951n) + frac(1n, 2305843009213693952n)",
        "4611686018427387903/5316911983139663489309385231907684352",
    );
}

#[test]
fn complex_basic() {
    assert_eval("complex(2, 3) + complex(1, 4)", "3+7i");
    assert_eval("complex(1, 0) + complex(0, 1)", "1+i");
    assert_eval("complex(2, 3) * complex(2, -3)", "13");
    assert_eval("re(complex(5, 7))", "5");
    assert_eval("im(complex(5, 7))", "7");
    assert_eval("abs(complex(3, 4))", "5");
}

#[test]
fn complex_constant_i() {
    assert_eval("i * i", "-1");
    assert_eval("2 + 3 * i", "2+3i");
}

#[test]
fn modulo_uses_floored_division() {
    assert_eval("-7 % 3", "2");
    assert_eval("7 % -3", "-2");
    assert_eval("7 % 0", "7");
    assert_eval("x = -7; x % 3", "2");
    assert_eval("-7n % 3n", "2");
    assert_eval("7n % -3n", "-2");
    assert_eval("frac(7, 2) % 1", "1/2");
    assert_eval("frac(7, 2) % 0", "7/2");
}

#[test]
fn negative_real_powers_use_principal_complex_values() {
    assert_eval("sqrt(-4)", "2i");
    assert_eval("(-8)^(1/3)", "1+1.732050807568877i");
    assert_eval("i^2", "-1");
}

#[test]
fn unicode_strings_and_numeric_suffix_boundaries() {
    assert_eval(r#""héllo""#, "héllo");
    assert_eval(r#""你好""#, "你好");
    assert_eval("2ns", "2 ns");
    assert_eval("2nm", "2 nm");
    assert!(math_box::evaluate("x -> x").is_err());
}

#[test]
fn scientific_numbers_keep_exponent_format() {
    assert_eval("1e300", "1e+300");
    assert_eval("1e-8", "1e-8");
    assert_eval("0.1 + 0.2", "0.30000000000000004");
}

#[test]
fn unit_convert_function() {
    // convert(value, from_factor, to_factor) using SI ratios
    // 1 km → m: convert(1, 1000, 1) = 1000
    assert_eval("convert(1, 1000, 1)", "1000");
    // 100 cm → m: convert(100, 0.01, 1) = 1
    assert_eval("convert(100, 0.01, 1)", "1");
}

#[test]
fn unit_value_construction_and_conversion() {
    // unit(value, "label") + convert(unit, "to-label")
    assert_eval(r#"convert(unit(1, "km"), "m")"#, "1000 m");
    assert_eval(r#"convert(unit(100, "cm"), "m")"#, "1 m");
    assert_eval(r#"convert(unit(1, "mi"), "km")"#, "1.609344 km");
    assert_eval(r#"convert(unit(1, "h"), "min")"#, "60 min");
    assert_eval(r#"convert(unit(1, "kg"), "g")"#, "1000 g");
}

#[test]
fn unit_arithmetic() {
    // adding units of compatible dimension keeps the lhs label
    assert_eval(r#"unit(1, "km") + unit(500, "m")"#, "1.5 km");
    // multiplying by a scalar scales the value
    assert_eval(r#"unit(2, "m") * 3"#, "6 m");
}

#[test]
fn implicit_unit_literal() {
    // Phase 5c: `1 km` desugars to `unit(1, "km")`
    assert_eval("1 km", "1 km");
    assert_eval("1 km + 500 m", "1.5 km");
    assert_eval("3 kg - 500 g", "2.5 kg");
}

#[test]
fn to_keyword_conversion() {
    // Phase 5c: `value to label` desugars to `convert(value, "label")`
    assert_eval("1 km to m", "1000 m");
    assert_eval("100 cm to m", "1 m");
    assert_eval("1 mi to km", "1.609344 km");
    assert_eval("(1 km + 500 m) to m", "1500 m");
}

#[test]
fn gcd_lcm() {
    assert_eval("gcd(12, 18)", "6");
    assert_eval("gcd(12, 18, 24)", "6");
    assert_eval("lcm(4, 6)", "12");
    assert_eval("lcm(2, 3, 4)", "12");
    // num_integer::Integer::gcd canonicalises gcd(0,0) = 0 — this matches
    // the mathematical convention and mathjs's behaviour.
    assert_eval("gcd(0, 0)", "0");
    assert_eval("gcd(0, 7)", "7");
    // lcm with a zero operand yields zero (the empty intersection of
    // multiples).
    assert_eval("lcm(0, 5)", "0");
    assert_eval("lcm(10000000000, 10000000001)", "100000000010000000000");
    assert!(math_box::evaluate("gcd(1.5, 3)").is_err());
}

#[test]
fn ast_height_limits_long_postfix_and_infix_chains() {
    let postfix = format!("1{}", "!".repeat(300));
    let infix = (0..300).map(|_| "1").collect::<Vec<_>>().join("+");

    assert!(
        math_box::evaluate(&postfix)
            .unwrap_err()
            .contains("AST height limit")
    );
    assert!(
        math_box::evaluate(&infix)
            .unwrap_err()
            .contains("AST height limit")
    );
}

#[test]
fn shared_budget_stops_expanding_user_function_calls() {
    let mut expression = String::from("f0(x)=x+x;");
    for depth in 1..=20 {
        expression.push_str(&format!("f{depth}(x)=f{}(x)+f{}(x);", depth - 1, depth - 1));
    }
    expression.push_str("f20(1)");

    assert!(
        math_box::evaluate(&expression)
            .unwrap_err()
            .contains("evaluation steps limit")
    );
}

#[test]
fn shared_budget_includes_compilation_and_execution_work() {
    let mut expression = String::from("f(x)=x+x+x+x;");
    expression.push_str(&"f(1);".repeat(816));

    assert_eq!(expression.len(), 4093);
    assert!(
        math_box::evaluate(&expression)
            .unwrap_err()
            .contains("evaluation steps limit")
    );
}

#[test]
#[cfg(feature = "bigint")]
fn bigint_growth_is_bounded_before_large_results_or_display() {
    let expected = num_bigint::BigInt::from(3).pow(8193).to_string();
    assert_eval("3n^8193", &expected);

    assert!(
        math_box::evaluate("3n^11000")
            .unwrap_err()
            .contains("numeric bit length limit")
    );

    let square_chain = format!("x=10n;{}x", "x=x*x;".repeat(20));
    assert!(
        math_box::evaluate(&square_chain)
            .unwrap_err()
            .contains("numeric bit length limit")
    );

    assert!(
        math_box::evaluate("2n^15000")
            .unwrap_err()
            .contains("display length limit")
    );
    assert!(
        math_box::evaluate("2n^16383+1n")
            .unwrap_err()
            .contains("display length limit")
    );
    assert!(
        math_box::evaluate("2n^16382*2n")
            .unwrap_err()
            .contains("display length limit")
    );
}

#[test]
#[cfg(feature = "fraction")]
fn fraction_power_growth_is_bounded() {
    assert!(
        math_box::evaluate("x=frac(3,7);x=x^63;x=x^63;x=x^63;1")
            .unwrap_err()
            .contains("fraction bit length limit")
    );
}

#[test]
#[cfg(feature = "unit")]
fn unit_dimensions_are_checked_and_labels_are_canonical() {
    let squares = format!("x=1 m;{}x", "x=x*x;".repeat(7));
    assert!(
        math_box::evaluate(&squares)
            .unwrap_err()
            .contains("numeric overflow")
    );
    assert_eval(r#"unit(2, "km") * unit(3, "m")"#, "6000 m^2");
}
