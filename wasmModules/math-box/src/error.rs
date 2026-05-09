use core::fmt;

#[derive(Clone, Debug, PartialEq)]
pub enum Error {
    InputTooLong { len: usize, limit: usize },
    UnexpectedChar { ch: char, pos: usize },
    InvalidNumber { text: alloc::string::String, pos: usize },
    UnexpectedToken { what: &'static str, pos: usize },
    UnexpectedEof,
    DepthExceeded { limit: usize },
    TooManyTokens { limit: usize },
    UnknownIdentifier { name: alloc::string::String },
    UnknownFunction { name: alloc::string::String },
    ArityMismatch { name: alloc::string::String, expected: usize, got: usize },
    DivisionByZero,
    NotANumber,
    Domain { what: &'static str },
    Overflow,
    TypeMismatch { op: &'static str, lhs: &'static str, rhs: &'static str },
    DimensionMismatch,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InputTooLong { len, limit } => {
                write!(f, "input too long: {len} bytes (limit {limit})")
            }
            Self::UnexpectedChar { ch, pos } => {
                write!(f, "unexpected character {ch:?} at position {pos}")
            }
            Self::InvalidNumber { text, pos } => {
                write!(f, "invalid number literal {text:?} at position {pos}")
            }
            Self::UnexpectedToken { what, pos } => {
                write!(f, "unexpected token: expected {what} at position {pos}")
            }
            Self::UnexpectedEof => write!(f, "unexpected end of input"),
            Self::DepthExceeded { limit } => {
                write!(f, "expression nesting too deep (limit {limit})")
            }
            Self::TooManyTokens { limit } => {
                write!(f, "too many tokens (limit {limit})")
            }
            Self::UnknownIdentifier { name } => write!(f, "unknown identifier: {name}"),
            Self::UnknownFunction { name } => write!(f, "unknown function: {name}"),
            Self::ArityMismatch { name, expected, got } => write!(
                f,
                "{name} expects {expected} argument(s), got {got}"
            ),
            Self::DivisionByZero => write!(f, "division by zero"),
            Self::NotANumber => write!(f, "result is not a number"),
            Self::Domain { what } => write!(f, "domain error: {what}"),
            Self::Overflow => write!(f, "numeric overflow"),
            Self::TypeMismatch { op, lhs, rhs } => {
                write!(f, "operator `{op}` does not apply to {lhs} and {rhs}")
            }
            Self::DimensionMismatch => {
                write!(f, "incompatible unit dimensions in operation")
            }
        }
    }
}

#[cfg(feature = "std")]
impl std::error::Error for Error {}

pub type Result<T> = core::result::Result<T, Error>;
