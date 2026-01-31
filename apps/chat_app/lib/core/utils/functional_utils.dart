// Functional programming utilities

/// Identity function - returns its input unchanged
T identity<T>(T value) => value;

/// Constant function - always returns the same value
T Function(dynamic) constant<T>(T value) => (_) => value;

/// Compose two functions (f . g) - right to left
R Function(A) compose<A, B, R>(
  R Function(B) f,
  B Function(A) g,
) =>
    (a) => f(g(a));

/// Compose multiple functions - right to left
T Function(T) composeAll<T>(List<T Function(T)> functions) {
  return functions.reversed.fold(
    identity,
    (composed, fn) => (value) => composed(fn(value)),
  );
}

/// Pipe two functions (f |> g) - left to right
R Function(A) pipe<A, B, R>(
  B Function(A) f,
  R Function(B) g,
) =>
    (a) => g(f(a));

/// Pipe value through functions - left to right
T pipeValue<T>(T value, List<T Function(T)> functions) {
  return functions.fold(value, (v, fn) => fn(v));
}

/// Curry a 2-argument function
R Function(B) Function(A) curry2<A, B, R>(R Function(A, B) fn) =>
    (a) => (b) => fn(a, b);

/// Curry a 3-argument function
R Function(C) Function(B) Function(A) curry3<A, B, C, R>(
  R Function(A, B, C) fn,
) =>
    (a) => (b) => (c) => fn(a, b, c);

/// Uncurry a curried 2-argument function
R Function(A, B) uncurry2<A, B, R>(R Function(B) Function(A) fn) =>
    (a, b) => fn(a)(b);

/// Uncurry a curried 3-argument function
R Function(A, B, C) uncurry3<A, B, C, R>(
  R Function(C) Function(B) Function(A) fn,
) =>
    (a, b, c) => fn(a)(b)(c);

/// Partial application - fix first argument
R Function(B) partial<A, B, R>(R Function(A, B) fn, A a) => (b) => fn(a, b);

/// Partial application - fix second argument
R Function(A) partialRight<A, B, R>(R Function(A, B) fn, B b) =>
    (a) => fn(a, b);

/// Flip arguments of a 2-argument function
R Function(B, A) flip<A, B, R>(R Function(A, B) fn) => (b, a) => fn(a, b);

/// Negate a predicate
bool Function(T) negate<T>(bool Function(T) predicate) =>
    (value) => !predicate(value);

/// Combine predicates with AND
bool Function(T) and<T>(List<bool Function(T)> predicates) =>
    (value) => predicates.every((p) => p(value));

/// Combine predicates with OR
bool Function(T) or<T>(List<bool Function(T)> predicates) =>
    (value) => predicates.any((p) => p(value));

/// Memoize a function (cache results)
R Function(A) memoize<A, R>(R Function(A) fn) {
  final cache = <A, R>{};
  return (a) => cache.putIfAbsent(a, () => fn(a));
}

/// Memoize with custom key function
R Function(A) memoizeBy<A, K, R>(
  R Function(A) fn,
  K Function(A) keyOf,
) {
  final cache = <K, R>{};
  return (a) => cache.putIfAbsent(keyOf(a), () => fn(a));
}

/// Memoize with expiration
R Function(A) memoizeWithExpiry<A, R>(
  R Function(A) fn,
  Duration expiry,
) {
  final cache = <A, (R, DateTime)>{};
  return (a) {
    final cached = cache[a];
    final now = DateTime.now();
    if (cached != null && now.difference(cached.$2) < expiry) {
      return cached.$1;
    }
    final result = fn(a);
    cache[a] = (result, now);
    return result;
  };
}

/// Memoize async function
Future<R> Function(A) memoizeAsync<A, R>(Future<R> Function(A) fn) {
  final cache = <A, Future<R>>{};
  return (a) => cache.putIfAbsent(a, () => fn(a));
}

/// Once - call function only once
T Function() once<T>(T Function() fn) {
  T? result;
  bool called = false;
  return () {
    if (!called) {
      result = fn();
      called = true;
    }
    return result as T;
  };
}

/// Delay function execution
void Function() delay<T>(void Function() fn, Duration duration) {
  bool pending = false;
  return () {
    if (!pending) {
      pending = true;
      Future.delayed(duration, () {
        pending = false;
        fn();
      });
    }
  };
}

/// Tap - execute side effect and return value
T tap<T>(T value, void Function(T) fn) {
  fn(value);
  return value;
}

/// Let - transform value with function
R let<T, R>(T value, R Function(T) fn) => fn(value);

/// Also - execute side effect and return value (alias for tap)
T also<T>(T value, void Function(T) fn) {
  fn(value);
  return value;
}

/// TakeIf - return value if predicate is true, else null
T? takeIf<T>(T value, bool Function(T) predicate) =>
    predicate(value) ? value : null;

/// TakeUnless - return value if predicate is false, else null
T? takeUnless<T>(T value, bool Function(T) predicate) =>
    !predicate(value) ? value : null;

/// Repeat function n times
List<T> repeat<T>(int times, T Function(int index) fn) =>
    List.generate(times, fn);

/// Try-catch wrapper returning nullable
T? tryOrNull<T>(T Function() fn) {
  try {
    return fn();
  } catch (_) {
    return null;
  }
}

/// Try-catch wrapper with default
T tryOrDefault<T>(T Function() fn, T defaultValue) {
  try {
    return fn();
  } catch (_) {
    return defaultValue;
  }
}

/// Lazy evaluation wrapper
class Lazy<T> {
  final T Function() _initializer;
  T? _value;
  bool _isInitialized = false;

  Lazy(this._initializer);

  T get value {
    if (!_isInitialized) {
      _value = _initializer();
      _isInitialized = true;
    }
    return _value as T;
  }

  bool get isInitialized => _isInitialized;

  void reset() {
    _value = null;
    _isInitialized = false;
  }
}

/// Extension to create Lazy from function
extension LazyExtension<T> on T Function() {
  Lazy<T> get lazy => Lazy(this);
}

/// Tuple types for functional programming
typedef Tuple2<T1, T2> = (T1, T2);
typedef Tuple3<T1, T2, T3> = (T1, T2, T3);
typedef Tuple4<T1, T2, T3, T4> = (T1, T2, T3, T4);

/// Tuple extensions
extension Tuple2Extensions<T1, T2> on (T1, T2) {
  T1 get first => $1;
  T2 get second => $2;

  (T2, T1) swap() => ($2, $1);

  (R1, R2) map<R1, R2>(R1 Function(T1) f1, R2 Function(T2) f2) =>
      (f1($1), f2($2));

  R fold<R>(R Function(T1, T2) fn) => fn($1, $2);

  List<dynamic> toList() => [$1, $2];
}

extension Tuple3Extensions<T1, T2, T3> on (T1, T2, T3) {
  T1 get first => $1;
  T2 get second => $2;
  T3 get third => $3;

  (R1, R2, R3) map<R1, R2, R3>(
    R1 Function(T1) f1,
    R2 Function(T2) f2,
    R3 Function(T3) f3,
  ) =>
      (f1($1), f2($2), f3($3));

  R fold<R>(R Function(T1, T2, T3) fn) => fn($1, $2, $3);

  List<dynamic> toList() => [$1, $2, $3];
}

/// Function types
typedef Predicate<T> = bool Function(T value);
typedef Transform<T, R> = R Function(T value);
typedef Consumer<T> = void Function(T value);
typedef Supplier<T> = T Function();
typedef BiFunction<A, B, R> = R Function(A a, B b);
typedef TriFunction<A, B, C, R> = R Function(A a, B b, C c);

/// Void unit type
class Unit {
  const Unit._();
  static const Unit value = Unit._();

  @override
  String toString() => 'Unit';

  @override
  bool operator ==(Object other) => other is Unit;

  @override
  int get hashCode => 0;
}

/// Convert any function to return Unit
Unit Function(A) toUnit<A, R>(R Function(A) fn) => (a) {
      fn(a);
      return Unit.value;
    };

/// Function extensions
extension FunctionExtensions<A, R> on R Function(A) {
  /// Compose with another function
  R Function(B) after<B>(A Function(B) g) => (b) => this(g(b));

  /// Compose in reverse order
  S Function(A) before<S>(S Function(R) g) => (a) => g(this(a));

  /// Apply function to value
  R applyTo(A value) => this(value);

  /// Convert to memoized version
  R Function(A) get memoized => memoize(this);
}

extension BiFunctionExtensions<A, B, R> on R Function(A, B) {
  /// Curry the function
  R Function(B) Function(A) get curried => (a) => (b) => this(a, b);

  /// Flip arguments
  R Function(B, A) get flipped => (b, a) => this(a, b);

  /// Partial application with first argument
  R Function(B) withFirst(A a) => (b) => this(a, b);

  /// Partial application with second argument
  R Function(A) withSecond(B b) => (a) => this(a, b);
}
