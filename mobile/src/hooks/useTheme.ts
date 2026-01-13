import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { lightTheme, darkTheme, Theme } from '../constants/theme';

export const useTheme = (): Theme => {
  const darkMode = useSelector((state: RootState) => state.settings.settings?.darkMode);

  return darkMode ? darkTheme : lightTheme;
};
