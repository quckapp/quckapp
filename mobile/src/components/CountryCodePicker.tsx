import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  TextInput,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Country {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', dial_code: '+91', flag: '🇮🇳' },
  { code: 'AE', name: 'UAE', dial_code: '+971', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', dial_code: '+65', flag: '🇸🇬' },
  { code: 'US', name: 'USA', dial_code: '+1', flag: '🇺🇸' },
];

interface Props {
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  disabled?: boolean;
}

export default function CountryCodePicker({ selectedCountry, onSelect, disabled }: Props) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dial_code.includes(searchQuery)
  );

  const handleSelect = (country: Country) => {
    onSelect(country);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.picker,
          { borderColor: theme.border, backgroundColor: theme.background },
          disabled && [styles.pickerDisabled, { backgroundColor: theme.backgroundSecondary }]
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.flag}>{selectedCountry.flag}</Text>
        <Text style={[styles.dialCode, { color: theme.text }]}>{selectedCountry.dial_code}</Text>
        <Text style={[styles.arrow, { color: theme.textSecondary }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Country</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Search country..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    { borderBottomColor: theme.borderLight },
                    item.code === selectedCountry.code && [styles.selectedCountryItem, { backgroundColor: theme.backgroundSecondary }],
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.countryDialCode, { color: theme.textSecondary }]}>{item.dial_code}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No countries found</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export { COUNTRIES };
export type { Country };

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 110,
  },
  pickerDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  flag: {
    fontSize: 24,
    marginRight: 8,
  },
  dialCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  arrow: {
    fontSize: 10,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    paddingHorizontal: 10,
  },
  searchInput: {
    margin: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCountryItem: {
    backgroundColor: '#f0f8ff',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  countryName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  countryDialCode: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    color: '#999',
  },
});
