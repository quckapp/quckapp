/// Responsive breakpoints for different screen sizes
class Breakpoints {
  Breakpoints._();

  // Width breakpoints
  static const double mobile = 0;
  static const double tablet = 600;
  static const double desktop = 1024;
  static const double widescreen = 1440;

  // Height breakpoints
  static const double shortHeight = 600;
  static const double mediumHeight = 800;

  // Common device widths for reference
  static const double iPhoneSE = 375;
  static const double iPhone = 390;
  static const double iPhoneMax = 428;
  static const double iPadMini = 744;
  static const double iPad = 820;
  static const double iPadPro = 1024;
}

/// Device type based on screen width
enum DeviceType {
  mobile,
  tablet,
  desktop,
  widescreen,
}

/// Screen size category
enum ScreenSize {
  small,
  medium,
  large,
  extraLarge,
}
