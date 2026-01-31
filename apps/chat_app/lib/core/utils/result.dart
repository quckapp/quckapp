/// Result type for handling success and failure cases
/// Similar to Either in functional programming
sealed class Result<T, E> {
  const Result();

  /// Create a success result
  factory Result.success(T value) = Success<T, E>;

  /// Create a failure result
  factory Result.failure(E error) = Failure<T, E>;

  /// Check if result is success
  bool get isSuccess => this is Success<T, E>;

  /// Check if result is failure
  bool get isFailure => this is Failure<T, E>;

  /// Get value or null
  T? get valueOrNull => switch (this) {
        Success(value: final v) => v,
        Failure() => null,
      };

  /// Get error or null
  E? get errorOrNull => switch (this) {
        Success() => null,
        Failure(error: final e) => e,
      };

  /// Get value or throw
  T get valueOrThrow => switch (this) {
        Success(value: final v) => v,
        Failure(error: final e) => throw Exception('Result is failure: $e'),
      };

  /// Get value or default
  T getOrElse(T defaultValue) => switch (this) {
        Success(value: final v) => v,
        Failure() => defaultValue,
      };

  /// Get value or compute default
  T getOrCompute(T Function(E error) compute) => switch (this) {
        Success(value: final v) => v,
        Failure(error: final e) => compute(e),
      };

  /// Map success value
  Result<U, E> map<U>(U Function(T value) transform) => switch (this) {
        Success(value: final v) => Result.success(transform(v)),
        Failure(error: final e) => Result.failure(e),
      };

  /// Map error
  Result<T, F> mapError<F>(F Function(E error) transform) => switch (this) {
        Success(value: final v) => Result.success(v),
        Failure(error: final e) => Result.failure(transform(e)),
      };

  /// FlatMap (bind) success value
  Result<U, E> flatMap<U>(Result<U, E> Function(T value) transform) =>
      switch (this) {
        Success(value: final v) => transform(v),
        Failure(error: final e) => Result.failure(e),
      };

  /// Fold result into single value
  U fold<U>({
    required U Function(T value) onSuccess,
    required U Function(E error) onFailure,
  }) =>
      switch (this) {
        Success(value: final v) => onSuccess(v),
        Failure(error: final e) => onFailure(e),
      };

  /// Execute side effect on success
  Result<T, E> onSuccess(void Function(T value) action) {
    if (this case Success(value: final v)) {
      action(v);
    }
    return this;
  }

  /// Execute side effect on failure
  Result<T, E> onFailure(void Function(E error) action) {
    if (this case Failure(error: final e)) {
      action(e);
    }
    return this;
  }

  /// Convert to async result
  Future<Result<T, E>> toFuture() => Future.value(this);
}

/// Success case
final class Success<T, E> extends Result<T, E> {
  final T value;
  const Success(this.value);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Success<T, E> && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'Success($value)';
}

/// Failure case
final class Failure<T, E> extends Result<T, E> {
  final E error;
  const Failure(this.error);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Failure<T, E> && other.error == error;

  @override
  int get hashCode => error.hashCode;

  @override
  String toString() => 'Failure($error)';
}

/// Async Result type
typedef AsyncResult<T, E> = Future<Result<T, E>>;

/// Extensions for Future to Result conversion
extension FutureResultExtension<T> on Future<T> {
  /// Convert Future to Result, catching exceptions
  AsyncResult<T, Exception> toResult() async {
    try {
      return Result.success(await this);
    } on Exception catch (e) {
      return Result.failure(e);
    }
  }

  /// Convert Future to Result with custom error type
  AsyncResult<T, E> toResultWith<E>(E Function(Object error) errorMapper) async {
    try {
      return Result.success(await this);
    } catch (e) {
      return Result.failure(errorMapper(e));
    }
  }
}

/// Extensions for Result lists
extension ResultListExtension<T, E> on Iterable<Result<T, E>> {
  /// Collect all successes, fail on first failure
  Result<List<T>, E> sequence() {
    final values = <T>[];
    for (final result in this) {
      switch (result) {
        case Success(value: final v):
          values.add(v);
        case Failure(error: final e):
          return Result.failure(e);
      }
    }
    return Result.success(values);
  }

  /// Collect all successes, ignoring failures
  List<T> successes() => [
        for (final result in this)
          if (result case Success(value: final v)) v,
      ];

  /// Collect all failures
  List<E> failures() => [
        for (final result in this)
          if (result case Failure(error: final e)) e,
      ];

  /// Partition into successes and failures
  (List<T> successes, List<E> failures) partition() {
    final successes = <T>[];
    final failures = <E>[];
    for (final result in this) {
      switch (result) {
        case Success(value: final v):
          successes.add(v);
        case Failure(error: final e):
          failures.add(e);
      }
    }
    return (successes, failures);
  }
}

/// Option type for nullable values
sealed class Option<T> {
  const Option();

  factory Option.some(T value) = Some<T>;
  factory Option.none() = None<T>;
  factory Option.fromNullable(T? value) =>
      value != null ? Some(value) : None<T>();

  bool get isSome => this is Some<T>;
  bool get isNone => this is None<T>;

  T? get valueOrNull => switch (this) {
        Some(value: final v) => v,
        None() => null,
      };

  T getOrElse(T defaultValue) => switch (this) {
        Some(value: final v) => v,
        None() => defaultValue,
      };

  Option<U> map<U>(U Function(T value) transform) => switch (this) {
        Some(value: final v) => Option.some(transform(v)),
        None() => Option.none(),
      };

  Option<U> flatMap<U>(Option<U> Function(T value) transform) => switch (this) {
        Some(value: final v) => transform(v),
        None() => Option.none(),
      };

  U fold<U>({
    required U Function(T value) onSome,
    required U Function() onNone,
  }) =>
      switch (this) {
        Some(value: final v) => onSome(v),
        None() => onNone(),
      };
}

final class Some<T> extends Option<T> {
  final T value;
  const Some(this.value);

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is Some<T> && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'Some($value)';
}

final class None<T> extends Option<T> {
  const None();

  @override
  bool operator ==(Object other) => identical(this, other) || other is None<T>;

  @override
  int get hashCode => 0;

  @override
  String toString() => 'None';
}
