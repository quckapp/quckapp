import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'app.dart';
import 'bloc/bloc.dart';
import 'services/auth_service.dart';
import 'services/realtime_service.dart';
import 'services/chat_service.dart';
import 'services/presence_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Create services
  final authService = AuthService();
  final realtimeService = RealtimeService();
  final chatService = ChatService(realtimeService);
  final presenceService = PresenceService(realtimeService);

  runApp(
    MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (_) => AuthBloc(
            authService: authService,
            realtimeService: realtimeService,
          ),
        ),
        BlocProvider<RealtimeBloc>(
          create: (_) => RealtimeBloc(realtimeService: realtimeService),
        ),
        BlocProvider<ChatBloc>(
          create: (_) => ChatBloc(chatService: chatService),
        ),
        BlocProvider<PresenceBloc>(
          create: (_) => PresenceBloc(presenceService: presenceService),
        ),
        BlocProvider<TypingBloc>(
          create: (_) => TypingBloc(chatService: chatService),
        ),
      ],
      child: const ChatApp(),
    ),
  );
}
