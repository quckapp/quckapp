import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'bloc/bloc.dart';
import 'core/theme/theme.dart';
import 'ui/screens/screens.dart';

/// A Listenable that notifies when auth state changes
class AuthChangeNotifier extends ChangeNotifier {
  AuthChangeNotifier(this._authBloc) {
    _authBloc.stream.listen((_) {
      notifyListeners();
    });
  }

  final AuthBloc _authBloc;

  AuthState get authState => _authBloc.state;
}

class ChatApp extends StatefulWidget {
  const ChatApp({super.key});

  @override
  State<ChatApp> createState() => _ChatAppState();
}

class _ChatAppState extends State<ChatApp> {
  late final GoRouter _router;
  late final AuthChangeNotifier _authNotifier;
  ThemeMode _themeMode = ThemeMode.system;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Initialize router only once
    if (!_isRouterInitialized) {
      _authNotifier = AuthChangeNotifier(context.read<AuthBloc>());
      _router = _createRouter();
      _isRouterInitialized = true;
    }
  }

  bool _isRouterInitialized = false;

  void _toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.light
          ? ThemeMode.dark
          : ThemeMode.light;
    });
  }

  GoRouter _createRouter() {
    return GoRouter(
      initialLocation: '/login',
      refreshListenable: _authNotifier,
      redirect: (context, state) {
        final authState = _authNotifier.authState;
        final isLoggedIn = authState.isAuthenticated;
        final needsProfileSetup = authState.needsProfileSetup;
        final isLoggingIn = state.matchedLocation == '/login';
        final isOtpScreen = state.matchedLocation == '/otp';
        final isRegisterNameScreen = state.matchedLocation == '/register-name';

        // Show nothing while checking initial auth
        if (authState.status == AuthStatus.initial) {
          return null;
        }

        // Handle OTP verification
        if (authState.isOtpSent && !isOtpScreen) {
          return '/otp';
        }

        // Handle new user - must register name first
        if (needsProfileSetup && !isRegisterNameScreen) {
          return '/register-name';
        }

        // Don't allow register-name if not in profile setup mode
        if (!needsProfileSetup && isRegisterNameScreen && !isLoggedIn) {
          return '/login';
        }

        // Redirect to login if not logged in and not on auth screens
        if (!isLoggedIn && !needsProfileSetup && !isLoggingIn && !isOtpScreen) {
          return '/login';
        }

        // Redirect to home if logged in and trying to access auth pages
        if (isLoggedIn && (isLoggingIn || isOtpScreen || isRegisterNameScreen)) {
          return '/';
        }

        return null;
      },
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const ConversationsScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/otp',
          builder: (context, state) => const OtpScreen(),
        ),
        GoRoute(
          path: '/register-name',
          builder: (context, state) => const RegisterNameScreen(),
        ),
        GoRoute(
          path: '/settings',
          builder: (context, state) => SettingsScreen(
            onToggleTheme: _toggleTheme,
            isDarkMode: _themeMode == ThemeMode.dark,
          ),
        ),
        GoRoute(
          path: '/conversations',
          builder: (context, state) => const ConversationsScreen(),
        ),
        GoRoute(
          path: '/chat/:id',
          builder: (context, state) => ChatScreen(
            conversationId: state.pathParameters['id']!,
          ),
        ),
        GoRoute(
          path: '/new-chat',
          builder: (context, state) => const NewChatScreen(),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Build a placeholder until router is initialized
    if (!_isRouterInitialized) {
      return MaterialApp(
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: _themeMode,
        home: Scaffold(
          body: Center(
            child: CircularProgressIndicator(
              color: AppColors.primary,
            ),
          ),
        ),
      );
    }

    return MaterialApp.router(
      title: 'QuickApp Chat',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: _themeMode,
      routerConfig: _router,
    );
  }
}
