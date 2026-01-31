import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/bloc.dart';
import '../../core/theme/theme.dart';
import '../widgets/common/app_button.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  String _countryCode = '+91';

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    if (!_formKey.currentState!.validate()) return;

    final phoneNumber = '$_countryCode${_phoneController.text.trim()}';
    context.read<AuthBloc>().add(AuthRequestOtp(phoneNumber));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.error != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.error!),
              backgroundColor: AppColors.error,
            ),
          );
          context.read<AuthBloc>().add(const AuthClearError());
        }
      },
      builder: (context, authState) {
        return Scaffold(
          body: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: AppSpacing.paddingLg,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Logo/Icon
                        Center(
                          child: Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primaryContainer,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.chat_bubble_rounded,
                              size: 40,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ),
                        AppSpacing.verticalSpaceXl,

                        // Title
                        Text(
                          'Welcome',
                          style: AppTypography.headlineMedium.copyWith(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.onSurface,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        AppSpacing.verticalSpaceXs,
                        Text(
                          'Enter your phone number to continue',
                          style: AppTypography.bodyLarge.copyWith(
                            color: AppColors.grey600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        AppSpacing.verticalSpaceXl,

                        // Phone number field with country code
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Country code dropdown
                            Container(
                              height: AppSpacing.inputHeightLg,
                              decoration: BoxDecoration(
                                color: theme.inputDecorationTheme.fillColor,
                                borderRadius: AppSpacing.borderRadiusMd,
                                border: Border.all(
                                  color: theme.colorScheme.outline,
                                ),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _countryCode,
                                  padding: AppSpacing.horizontalSm,
                                  borderRadius: AppSpacing.borderRadiusMd,
                                  items: const [
                                    DropdownMenuItem(value: '+91', child: Text('+91')),
                                    DropdownMenuItem(value: '+1', child: Text('+1')),
                                    DropdownMenuItem(value: '+44', child: Text('+44')),
                                    DropdownMenuItem(value: '+86', child: Text('+86')),
                                    DropdownMenuItem(value: '+81', child: Text('+81')),
                                  ],
                                  onChanged: (value) {
                                    if (value != null) {
                                      setState(() {
                                        _countryCode = value;
                                      });
                                    }
                                  },
                                ),
                              ),
                            ),
                            AppSpacing.horizontalSpaceSm,
                            // Phone number input
                            Expanded(
                              child: TextFormField(
                                controller: _phoneController,
                                keyboardType: TextInputType.phone,
                                textInputAction: TextInputAction.done,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                  LengthLimitingTextInputFormatter(10),
                                ],
                                onFieldSubmitted: (_) => _handleSendOtp(),
                                decoration: const InputDecoration(
                                  labelText: 'Phone Number',
                                  prefixIcon: Icon(Icons.phone_outlined),
                                  hintText: '9876543210',
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your phone number';
                                  }
                                  if (value.length < 10) {
                                    return 'Please enter a valid phone number';
                                  }
                                  return null;
                                },
                              ),
                            ),
                          ],
                        ),
                        AppSpacing.verticalSpaceLg,

                        // Send OTP button
                        AppButton.filled(
                          label: 'Send OTP',
                          isLoading: authState.isLoading,
                          isFullWidth: true,
                          size: AppButtonSize.large,
                          onPressed: _handleSendOtp,
                        ),
                        AppSpacing.verticalSpaceLg,

                        // Terms text
                        Text(
                          'By continuing, you agree to our Terms of Service and Privacy Policy',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.grey500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
