use math_box::{Compiled, evaluate, evaluate_typed};

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
fn fraction_bigint_arithmetic_is_exact_in_both_orders() {
    let integer = "1000000000000000000000000000000";
    assert_eval(
        &format!("frac(1, 2) + {integer}"),
        "2000000000000000000000000000001/2",
    );
    assert_eval(
        &format!("{integer} + frac(1, 2)"),
        "2000000000000000000000000000001/2",
    );
    assert_eval(
        &format!("frac(1, 2) - {integer}"),
        "-1999999999999999999999999999999/2",
    );
    assert_eval(
        &format!("{integer} - frac(1, 2)"),
        "1999999999999999999999999999999/2",
    );
    assert_eval(
        &format!("frac(1, 2) * {integer}"),
        "500000000000000000000000000000",
    );
    assert_eval(
        &format!("{integer} * frac(1, 2)"),
        "500000000000000000000000000000",
    );
    assert_eval(
        &format!("frac(1, 2) / {integer}"),
        "1/2000000000000000000000000000000",
    );
    assert_eval(
        &format!("{integer} / frac(1, 2)"),
        "2000000000000000000000000000000",
    );
    assert!(math_box::evaluate("frac(1, 2) / 0n").is_err());
    assert!(math_box::evaluate("0n / frac(1, 2)").is_ok());
}

#[test]
fn factorial_preserves_integral_num_and_fraction_values() {
    let factorial_171 = "1241018070217667823424840524103103992616605577501693185388951803611996075221691752992751978120487585576464959501670387052809889858690710767331242032218484364310473577889968548278290754541561964852153468318044293239598173696899657235903947616152278558180061176365108428800000000000000000000000000000000000000000";
    assert_eval("25!", "15511210043330985984000000");
    assert_eval("25n!", "15511210043330985984000000");
    assert_eval("fact(25)", "15511210043330985984000000");
    assert_eval("fact(25n)", "15511210043330985984000000");
    assert_eval("frac(25, 1)!", "15511210043330985984000000");
    assert_eval("fact(frac(25, 1))", "15511210043330985984000000");
    assert_eval("171!", factorial_171);
    assert_eval("171n!", factorial_171);
    assert_eval("fact(171)", factorial_171);
    assert_eval("fact(frac(171, 1))", factorial_171);
    assert_eval("x = 171; x!", factorial_171);
    assert!(math_box::evaluate("frac(5, 2)!").is_err());
    assert!(math_box::evaluate("(-1)!").is_err());
}

#[test]
fn power_exact_dispatch_handles_fraction_exponents() {
    assert_eval("9007199254740993n ^ frac(1, 1)", "9007199254740993");
    assert_eval("frac(1, 2)^64", "1/18446744073709551616");
    assert_eval("frac(1, 2)^64n", "1/18446744073709551616");
    assert_eval("frac(1, 2)^65", "1/36893488147419103232");
    assert_eval("x = frac(1, 2); x^64", "1/18446744073709551616");
    assert_eval("(-8)^frac(1, 3)", "1+1.732050807568877i");
    assert!(math_box::evaluate("2n ^ frac(1, 2)").is_err());
    assert!(math_box::evaluate("frac(1, 2)^frac(1, 3)").is_err());
}

#[test]
fn complex_integer_exponent_rejects_unrepresentable_f64() {
    assert_eval("i ^ 9223372036854774784.0", "1");
    assert_eval("i ^ -9223372036854775808.0", "1");
    assert!(math_box::evaluate("i ^ 9223372036854775808.0").is_err());
    assert!(math_box::evaluate("i ^ 9223372036854775807.0").is_err());
}

#[test]
fn modulo_checks_exact_zero_and_rejects_complex_big_mix() {
    assert_eval("1.5 % 0n", "1.5");
    assert_eval("frac(3, 2) % 0n", "3/2");
    assert_eval("1.5 % frac(0, 1)", "1.5");
    assert_eval("(5n % frac(0, 1)) / 2", "2");
    assert_eval("(-5n % frac(0, 1)) / 2", "-2");
    assert_eval("5n % frac(3, 2)", "1/2");
    assert_eval("-1.5 % -0", "-1.5");
    assert_eval("frac(-7, 2) % 3", "5/2");
    assert_eval("frac(7, 2) % -3", "-5/2");
    assert!(math_box::evaluate("(0n % frac(0, 1)) + 0.5").is_err());
    assert!(math_box::evaluate("(9007199254740993n % frac(0, 1)) + 0.5").is_err());
    assert!(math_box::evaluate("1n % 0.5").is_err());
    assert!(math_box::evaluate("9007199254740993n % complex(10, 0)").is_err());
    assert!(math_box::evaluate("complex(10, 0) % 9007199254740993n").is_err());
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
fn unit_scaling_rejects_overflow_and_underflow() {
    for input in [
        "1e308 km",
        r#"unit(1e308, "km")"#,
        "5e-324 nm",
        r#"unit(5e-324, "nm")"#,
    ] {
        assert!(
            math_box::evaluate(input)
                .unwrap_err()
                .contains("numeric overflow"),
            "{input} should overflow"
        );
    }

    assert_eval("5e-324 m", "5e-324 m");
    assert_eval(r#"unit(5e-324, "m")"#, "5e-324 m");
    assert_eval("0 nm", "0 nm");
    assert_eval(r#"unit(0, "nm")"#, "0 nm");
    assert_eval("-273.15 degC", "-273.15 degC");
    assert_eval("-273.15 degC to K", "0 K");
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
    assert!(math_box::evaluate("lcm(0, 5, 1.5)").is_err());
    assert!(math_box::evaluate("lcm(2, 0, 1.5)").is_err());
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

#[test]
fn typed_math_b_operations() {
    assert_eval("10 km / 2 h", "5 km/h");
    assert_eval("1 km / 1 s", "1 km/s");
    assert_eval("2 km * 3 m", "6000 m^2");
    assert_eval("max(1 km, 500 m)", "1 km");
    assert_eval("min(1 km, 500 m)", "500 m");
    assert_eval("1 km % 300 m", "0.1 km");
    assert_eval("(2 m)^2", "4 m^2");
    assert_eval("sqrt(4 m^2)", "2 m");
    assert_eval("abs(-5 km)", "5 km");
    assert_eval("abs(-9007199254740993n)", "9007199254740993");
    assert_eval("abs(-frac(1, 3))", "1/3");
    assert_eval("5 / 2 s", "2.5 s^-1");
}

#[test]
fn comparisons_logical_implicit_multiplication_and_percent() {
    assert_eval("1 < 2", "true");
    assert_eval("1 <= 1", "true");
    assert_eval("3 > 2", "true");
    assert_eval("3 != 2", "true");
    assert_eval("2 == 2", "true");
    assert_eval("2 >= 2 && true", "true");
    assert_eval("true && false", "false");
    assert_eval("false && (1 / 0)", "false");
    assert_eval("true || (1 / 0)", "true");
    assert_eval("!false", "true");
    assert!(math_box::evaluate("!1").is_err());
    assert!(math_box::evaluate("1 && true").is_err());
    assert_eval("2 pi", "6.283185307179586");
    assert_eval("2(3 + 4)", "14");
    assert_eval("(2 + 1)(4 + 1)", "15");
    assert_eval("50%", "0.5");
    assert_eval("50n%", "1/2");
    assert_eval("10% of 200", "20");
    assert_eval("50 % -3", "-1");
}

#[test]
fn affine_and_composite_conversions() {
    assert_eval("0 degC to degF", "32 degF");
    assert_eval("32 degF to degC", "0 degC");
    assert_eval("-40 degC to degF", "-40 degF");
    assert_eval("-5 degC", "-5 degC");
    assert_eval("abs(-5 degC)", "5 degC");
    assert_eval("1 MB to B", "1000000 B");
    assert_eval("1 MiB to B", "1048576 B");
    assert_eval("8 bit to B", "1 B");
    assert_eval("0 K to degC", "-273.15 degC");
    assert_eval("10 m/s^2", "10 m/s^2");
    assert_eval("1 m/s^-2", "1 m/s^-2");
    assert_eval("10 m/s to km/h", "36 km/h");
    assert_eval("10000 cm^2 to m^2", "1 m^2");
    assert!(math_box::evaluate("unit(-1, \"K\")").is_err());
    assert!(math_box::evaluate("-1 K").is_err());
    assert!(math_box::evaluate("1 degC + 1 degC").is_err());
    assert!(math_box::evaluate("sqrt(4 m)").is_err());
    assert!(math_box::evaluate("sqrt(-4 m^2)").is_err());
}

#[test]
fn typed_results_and_compiled_budget_reset() {
    let result = evaluate_typed("9007199254740993n").expect("typed bigint");
    assert_eq!(result.kind(), "big");
    assert_eq!(result.text(), "9007199254740993");
    assert!(result.exact());
    assert!(result.finite());

    let fraction = evaluate_typed("frac(1, 3)").expect("typed fraction");
    assert_eq!(fraction.kind(), "fraction");
    assert!(fraction.exact());

    let boolean = evaluate_typed("1 < 2").expect("typed boolean");
    assert_eq!(boolean.kind(), "bool");
    assert_eq!(boolean.text(), "true");

    let string = evaluate_typed("\"hello\"").expect("typed string");
    assert_eq!(string.kind(), "string");
    let function = evaluate_typed("f(x) = x").expect("typed function");
    assert_eq!(function.kind(), "function");
    let nonfinite = evaluate_typed("0 / 0").expect("typed nonfinite");
    assert_eq!(nonfinite.kind(), "num");
    assert!(!nonfinite.finite());
    let unit = evaluate_typed("1 km").expect("typed unit");
    assert_eq!(unit.kind(), "unit");

    let compiled = Compiled::new("x = 1; x + 1").expect("compile");
    assert_eq!(compiled.evaluate().expect("first run"), "2");
    assert_eq!(compiled.evaluate().expect("second run"), "2");

    let bounded = Compiled::new("3n^11000").expect("bounded compile");
    assert!(bounded.evaluate().is_err());
    assert!(bounded.evaluate().is_err());
}

#[test]
#[cfg(feature = "unit")]
fn reviewed_unit_parser_and_display_regressions() {
    assert!(math_box::evaluate(r#"unit(1, "°C/s")"#).is_err());
    assert!(math_box::evaluate("1 °C/s").is_err());
    assert!(math_box::evaluate(r#"convert(unit(1, "m"), "m/°C")"#).is_err());
    assert_eval("(1 m/s)^2", "1 m^2/s^2");
    assert_eval("(1 km/h)^2", "1 km^2/h^2");
    assert_eval("1 m^2/s^2", "1 m^2/s^2");
    assert_eval(r#"unit(1, "m/s") / unit(1, "m/s^2")"#, "1 s");
    assert_eval(r#"unit(1, "s^-1") * unit(1, "s^-1")"#, "1 s^-2");
    assert_eval("5 / 2 m^2", "2.5 m^-2");
    assert_eval("1e-13 m", "1e-13 m");
    assert_eval("1000000000000000.25 m", "1000000000000000.3 m");
    assert_eval("1000000000000000.5 m", "1000000000000000.5 m");
    assert_eval("1000000000000000.5 m - 1000000000000000 m", "0.5 m");
    assert_eval("sqrt(4 km*m)", "63.245553203367585 m");
    assert_eval("sqrt(4 km*m) to m", "63.245553203367585 m");
    assert_eval("sqrt(4 N*kg*m)", "2 m*kg/s");
    assert_eval("sqrt(4 m/m)", "2");
    assert_eval("4 km/m", "4000");
    assert_eval(r#"unit(4, "km/m")"#, "4000");
    assert_eval("4 km / 1 m", "4000");
    assert_eval("4 km/m + 1", "4001");
    assert!(math_box::evaluate("1 nm^50").is_err());
}

#[test]
fn reviewed_logical_and_numeric_regressions() {
    assert!(math_box::evaluate("true && 1").is_err());
    assert!(math_box::evaluate("false || 1").is_err());
    assert_eval("false && ((-1)! == 1)", "false");
    assert_eval("true || ((-1)! == 1)", "true");
    assert_eval("2 min(1, 2)", "2");
    assert_eval("2 min", "2 min");
    assert_eval("2 m / min(1, 2)", "2 m");
    assert_eval("2 m * min(1, 2)", "2 m");
    assert_eval("2 m/min", "2 m/min");
    assert_eval("2n^2000 < Infinity", "true");
    assert_eval("2n^2000 == Infinity", "false");
    assert_eval("frac(2n^2000, 1) < Infinity", "true");
    assert_eval("frac(2n^2000, 1) == Infinity", "false");
    assert_eval("Infinity > frac(2n^2000, 1)", "true");
    assert_eval("Infinity == frac(2n^2000, 1)", "false");
    assert_eval("9007199254740993n == complex(9007199254740992, 0)", "false");
    assert_eval("complex(9007199254740992, 0) == 9007199254740993n", "false");
    assert_eval("frac(1, 2) == complex(0.5, 0)", "true");
    assert_eval("complex(0.5, 0) == frac(1, 2)", "true");
    assert_eval("frac(1, 10) == complex(0.1, 0)", "false");
    assert_eval("complex(0.1, 0) == frac(1, 10)", "false");
}

#[test]
#[cfg(feature = "fraction")]
fn fraction_float_comparisons_are_exact_without_bigint() {
    assert_eval("frac(1, 2) == 0.5", "true");
    assert_eval("0.5 == frac(1, 2)", "true");
    assert_eval("frac(1, 10) == 0.1", "false");
    assert_eval("0.1 == frac(1, 10)", "false");
    assert_eval("frac(1, 3) < Infinity", "true");
    assert_eval("Infinity > frac(1, 3)", "true");

    #[cfg(feature = "complex")]
    {
        assert_eval("frac(1, 2) == complex(0.5, 0)", "true");
        assert_eval("complex(0.1, 0) == frac(1, 10)", "false");
    }
}

#[test]
fn reviewed_function_result_kind_does_not_match_string_text() {
    let string = evaluate_typed(r#""<fn f/1>""#).expect("literal string");
    assert_eq!(string.kind(), "string");
    let function = evaluate_typed("f(x) = x").expect("function definition");
    assert_eq!(function.kind(), "function");
}
