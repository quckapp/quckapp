import 'dart:async';

/// Interface for disposable resources
abstract interface class Disposable {
  void dispose();
}

/// Async disposable interface
abstract interface class AsyncDisposable {
  Future<void> dispose();
}

/// Composite disposable for managing multiple disposables
class CompositeDisposable implements Disposable {
  final List<Disposable> _disposables = [];
  bool _isDisposed = false;

  bool get isDisposed => _isDisposed;

  void add(Disposable disposable) {
    if (_isDisposed) {
      disposable.dispose();
      return;
    }
    _disposables.add(disposable);
  }

  void addAll(Iterable<Disposable> disposables) {
    for (final disposable in disposables) {
      add(disposable);
    }
  }

  void remove(Disposable disposable) {
    _disposables.remove(disposable);
  }

  void clear() {
    for (final disposable in _disposables) {
      disposable.dispose();
    }
    _disposables.clear();
  }

  @override
  void dispose() {
    if (_isDisposed) return;
    _isDisposed = true;
    clear();
  }

  int get length => _disposables.length;
}

/// Async composite disposable
class AsyncCompositeDisposable implements AsyncDisposable {
  final List<AsyncDisposable> _disposables = [];
  bool _isDisposed = false;

  bool get isDisposed => _isDisposed;

  void add(AsyncDisposable disposable) {
    if (_isDisposed) {
      disposable.dispose();
      return;
    }
    _disposables.add(disposable);
  }

  void addAll(Iterable<AsyncDisposable> disposables) {
    for (final disposable in disposables) {
      add(disposable);
    }
  }

  void remove(AsyncDisposable disposable) {
    _disposables.remove(disposable);
  }

  Future<void> clear() async {
    await Future.wait(_disposables.map((d) => d.dispose()));
    _disposables.clear();
  }

  @override
  Future<void> dispose() async {
    if (_isDisposed) return;
    _isDisposed = true;
    await clear();
  }
}

/// Wrapper to make StreamSubscription disposable
class SubscriptionDisposable implements Disposable {
  final StreamSubscription _subscription;

  SubscriptionDisposable(this._subscription);

  @override
  void dispose() {
    _subscription.cancel();
  }
}

/// Wrapper to make Timer disposable
class TimerDisposable implements Disposable {
  final Timer _timer;

  TimerDisposable(this._timer);

  @override
  void dispose() {
    _timer.cancel();
  }
}

/// Wrapper to make any cleanup function disposable
class CallbackDisposable implements Disposable {
  final void Function() _onDispose;
  bool _isDisposed = false;

  CallbackDisposable(this._onDispose);

  @override
  void dispose() {
    if (_isDisposed) return;
    _isDisposed = true;
    _onDispose();
  }
}

/// Async callback disposable
class AsyncCallbackDisposable implements AsyncDisposable {
  final Future<void> Function() _onDispose;
  bool _isDisposed = false;

  AsyncCallbackDisposable(this._onDispose);

  @override
  Future<void> dispose() async {
    if (_isDisposed) return;
    _isDisposed = true;
    await _onDispose();
  }
}

/// Resource scope for automatic cleanup
class ResourceScope implements Disposable {
  final CompositeDisposable _disposables = CompositeDisposable();

  T use<T extends Disposable>(T resource) {
    _disposables.add(resource);
    return resource;
  }

  void onDispose(void Function() callback) {
    _disposables.add(CallbackDisposable(callback));
  }

  @override
  void dispose() {
    _disposables.dispose();
  }
}

/// Run block with automatic resource cleanup
R runScoped<R>(R Function(ResourceScope scope) block) {
  final scope = ResourceScope();
  try {
    return block(scope);
  } finally {
    scope.dispose();
  }
}

/// Async resource scope
class AsyncResourceScope implements AsyncDisposable {
  final AsyncCompositeDisposable _disposables = AsyncCompositeDisposable();

  T use<T extends AsyncDisposable>(T resource) {
    _disposables.add(resource);
    return resource;
  }

  void onDispose(Future<void> Function() callback) {
    _disposables.add(AsyncCallbackDisposable(callback));
  }

  @override
  Future<void> dispose() async {
    await _disposables.dispose();
  }
}

/// Run async block with automatic resource cleanup
Future<R> runScopedAsync<R>(
  Future<R> Function(AsyncResourceScope scope) block,
) async {
  final scope = AsyncResourceScope();
  try {
    return await block(scope);
  } finally {
    await scope.dispose();
  }
}

/// Extensions to make common types disposable
extension StreamSubscriptionDisposable<T> on StreamSubscription<T> {
  Disposable asDisposable() => SubscriptionDisposable(this);
}

extension TimerDisposableExtension on Timer {
  Disposable asDisposable() => TimerDisposable(this);
}

/// Auto-dispose mixin for stateful widgets
mixin AutoDisposeMixin {
  final CompositeDisposable _autoDisposables = CompositeDisposable();

  void autoDispose(Disposable disposable) {
    _autoDisposables.add(disposable);
  }

  void autoDisposeSubscription(StreamSubscription subscription) {
    _autoDisposables.add(SubscriptionDisposable(subscription));
  }

  void autoDisposeTimer(Timer timer) {
    _autoDisposables.add(TimerDisposable(timer));
  }

  void autoDisposeCallback(void Function() callback) {
    _autoDisposables.add(CallbackDisposable(callback));
  }

  void cancelAutoDisposables() {
    _autoDisposables.dispose();
  }
}

/// Single assignment disposable
class SingleAssignmentDisposable implements Disposable {
  Disposable? _disposable;
  bool _isDisposed = false;

  Disposable? get disposable => _disposable;

  set disposable(Disposable? value) {
    if (_isDisposed) {
      value?.dispose();
      return;
    }
    _disposable?.dispose();
    _disposable = value;
  }

  @override
  void dispose() {
    if (_isDisposed) return;
    _isDisposed = true;
    _disposable?.dispose();
    _disposable = null;
  }
}

/// Serial disposable - replaces old disposable
class SerialDisposable implements Disposable {
  Disposable? _current;
  bool _isDisposed = false;

  Disposable? get current => _current;

  set current(Disposable? value) {
    if (_isDisposed) {
      value?.dispose();
      return;
    }
    _current?.dispose();
    _current = value;
  }

  @override
  void dispose() {
    if (_isDisposed) return;
    _isDisposed = true;
    _current?.dispose();
    _current = null;
  }
}

/// Reference counted disposable
class RefCountedDisposable implements Disposable {
  final Disposable _disposable;
  int _refCount = 0;
  bool _isDisposed = false;

  RefCountedDisposable(this._disposable);

  void retain() {
    if (_isDisposed) return;
    _refCount++;
  }

  void release() {
    if (_isDisposed) return;
    _refCount--;
    if (_refCount <= 0) {
      dispose();
    }
  }

  @override
  void dispose() {
    if (_isDisposed) return;
    _isDisposed = true;
    _disposable.dispose();
  }

  int get refCount => _refCount;
  bool get isDisposed => _isDisposed;
}
