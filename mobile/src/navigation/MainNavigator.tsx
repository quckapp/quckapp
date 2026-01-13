import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Image, Text, Modal, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import ConversationsScreen from '../screens/main/ConversationsScreen';
import ChatScreen from '../screens/main/ChatScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import NewConversationScreen from '../screens/main/NewConversationScreen';
import NewGroupScreen from '../screens/main/NewGroupScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationSettingsScreen from '../screens/main/NotificationSettingsScreen';
import PrivacySecurityScreen from '../screens/main/PrivacySecurityScreen';
import AnalyticsScreen from '../screens/main/AnalyticsScreen';
import ContactInfoScreen from '../screens/main/ContactInfoScreen';
import ChatProfileScreen from '../screens/main/ChatProfileScreen';
import BroadcastListScreen from '../screens/main/BroadcastListScreen';
import StarredMessagesScreen from '../screens/main/StarredMessagesScreen';
import CommunitiesScreen from '../screens/main/CommunitiesScreen';
import LinkedDevicesScreen from '../screens/main/LinkedDevicesScreen';
import CreateBroadcastListScreen from '../screens/main/CreateBroadcastListScreen';
import BroadcastDetailsScreen from '../screens/main/BroadcastDetailsScreen';
import CreateCommunityScreen from '../screens/main/CreateCommunityScreen';
import CommunityDetailsScreen from '../screens/main/CommunityDetailsScreen';
import ForwardScreen from '../screens/main/ForwardScreen';
import UpdatesScreen from '../screens/main/UpdatesScreen';
import CallsScreen from '../screens/main/CallsScreen';
import MessageSearchScreen from '../screens/main/MessageSearchScreen';
import BackupScreen from '../screens/settings/BackupScreen';
import StatusViewerScreen from '../screens/main/StatusViewerScreen';
import CreateStatusScreen from '../screens/main/CreateStatusScreen';
import { HuddleCallScreen } from '../screens/HuddleCallScreen';
import CallScreen from '../screens/CallScreen';
import { useTheme } from '../hooks/useTheme';
import { RootState } from '../store';
import { Logo } from '../components/Logo';
import { CurvedTabBar } from '../components/CurvedTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ConversationsHeader = ({ navigation }: any) => {
  const theme = useTheme();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [showMenu, setShowMenu] = useState(false);

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Navigate to new conversation with image
      navigation.navigate('NewConversation', { image: result.assets[0].uri });
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to select photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Navigate to new conversation with image
      navigation.navigate('NewConversation', { image: result.assets[0].uri });
    }
  };

  const handleCameraPress = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: handleCamera },
        { text: 'Gallery', onPress: handleGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
        <TouchableOpacity
          style={{ marginRight: 18 }}
          onPress={() => navigation.navigate('MessageSearch')}
        >
          <Ionicons name="search-outline" size={24} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginRight: 18 }}
          onPress={handleCameraPress}
        >
          <Ionicons name="camera-outline" size={24} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginRight: 12 }}
          onPress={() => setShowMenu(true)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ProfileView')}>
          {currentUser?.avatar ? (
            <Image
              source={{ uri: currentUser.avatar }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
              }}
            />
          ) : (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={headerStyles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={[headerStyles.menuContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <TouchableOpacity
              style={[headerStyles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                setShowMenu(false);
                // Navigate to Communities tab and then to CreateCommunity
                navigation.navigate('Communities', { screen: 'CreateCommunity' });
              }}
            >
              <Ionicons name="globe-outline" size={22} color={theme.text} />
              <Text style={[headerStyles.menuText, { color: theme.text }]}>New Community</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[headerStyles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('BroadcastLists');
              }}
            >
              <Ionicons name="megaphone-outline" size={22} color={theme.text} />
              <Text style={[headerStyles.menuText, { color: theme.text }]}>Broadcast Lists</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[headerStyles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('StarredMessages');
              }}
            >
              <Ionicons name="star-outline" size={22} color={theme.text} />
              <Text style={[headerStyles.menuText, { color: theme.text }]}>Starred Messages</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const headerStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: 60,
    marginRight: 10,
    borderRadius: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 16,
  },
});

function ConversationsStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerBackground: () => (
          <BlurView
            intensity={theme.blur.intensity}
            tint={theme.blur.tint}
            style={StyleSheet.absoluteFill}
          >
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.blur.headerBackground }} />
          </BlurView>
        ),
        headerTransparent: Platform.OS === 'ios',
        headerTintColor: theme.primary,
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="ConversationsList"
        component={ConversationsScreen}
        options={({ navigation }) => ({
          headerTitle: () => <Logo width={120} height={40} />,
          headerRight: () => <ConversationsHeader navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ freezeOnBlur: false }}
      />
      <Stack.Screen
        name="NewConversation"
        component={NewConversationScreen}
        options={{ title: 'New Message' }}
      />
      <Stack.Screen
        name="NewGroup"
        component={NewGroupScreen}
        options={{ title: 'New Group' }}
      />
      <Stack.Screen
        name="ContactInfo"
        component={ContactInfoScreen}
        options={{ title: 'Contact Info' }}
      />
      <Stack.Screen
        name="ChatProfile"
        component={ChatProfileScreen}
        options={{ title: 'Chat Profile' }}
      />
      <Stack.Screen
        name="BroadcastLists"
        component={BroadcastListScreen}
        options={{ title: 'Broadcast Lists' }}
      />
      <Stack.Screen
        name="StarredMessages"
        component={StarredMessagesScreen}
        options={{ title: 'Starred Messages' }}
      />
      <Stack.Screen
        name="CreateBroadcastList"
        component={CreateBroadcastListScreen}
        options={{ title: 'New Broadcast List' }}
      />
      <Stack.Screen
        name="BroadcastDetails"
        component={BroadcastDetailsScreen}
        options={{ title: 'Broadcast List' }}
      />
      <Stack.Screen
        name="Forward"
        component={ForwardScreen}
        options={{ title: 'Forward to' }}
      />
      <Stack.Screen
        name="ProfileView"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Notification Settings' }}
      />
      <Stack.Screen
        name="PrivacySecurity"
        component={PrivacySecurityScreen}
        options={{ title: 'Privacy & Security' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Stack.Screen
        name="LinkedDevices"
        component={LinkedDevicesScreen}
        options={{ title: 'Linked Devices' }}
      />
      <Stack.Screen
        name="HuddleCall"
        component={HuddleCallScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Call"
        component={CallScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MessageSearch"
        component={MessageSearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Backup"
        component={BackupScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function UpdatesStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerBackground: () => (
          <BlurView
            intensity={theme.blur.intensity}
            tint={theme.blur.tint}
            style={StyleSheet.absoluteFill}
          >
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.blur.headerBackground }} />
          </BlurView>
        ),
        headerTransparent: Platform.OS === 'ios',
        headerTintColor: theme.primary,
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="UpdatesList"
        component={UpdatesScreen}
        options={{ title: 'Updates' }}
      />
      <Stack.Screen
        name="StatusViewer"
        component={StatusViewerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateStatus"
        component={CreateStatusScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function CommunitiesStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerBackground: () => (
          <BlurView
            intensity={theme.blur.intensity}
            tint={theme.blur.tint}
            style={StyleSheet.absoluteFill}
          >
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.blur.headerBackground }} />
          </BlurView>
        ),
        headerTransparent: Platform.OS === 'ios',
        headerTintColor: theme.primary,
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="CommunitiesList"
        component={CommunitiesScreen}
        options={{ title: 'Communities' }}
      />
      <Stack.Screen
        name="CreateCommunity"
        component={CreateCommunityScreen}
        options={{ title: 'New Community' }}
      />
      <Stack.Screen
        name="CommunityDetails"
        component={CommunityDetailsScreen}
        options={{ title: 'Community Details' }}
      />
    </Stack.Navigator>
  );
}

function CallsStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerBackground: () => (
          <BlurView
            intensity={theme.blur.intensity}
            tint={theme.blur.tint}
            style={StyleSheet.absoluteFill}
          >
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.blur.headerBackground }} />
          </BlurView>
        ),
        headerTransparent: Platform.OS === 'ios',
        headerTintColor: theme.primary,
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="CallsList"
        component={CallsScreen}
        options={{ title: 'Calls' }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerBackground: () => (
          <BlurView
            intensity={theme.blur.intensity}
            tint={theme.blur.tint}
            style={StyleSheet.absoluteFill}
          >
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.blur.headerBackground }} />
          </BlurView>
        ),
        headerTransparent: Platform.OS === 'ios',
        headerTintColor: theme.primary,
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="ProfileView"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Notification Settings' }}
      />
      <Stack.Screen
        name="PrivacySecurity"
        component={PrivacySecurityScreen}
        options={{ title: 'Privacy & Security' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Stack.Screen
        name="LinkedDevices"
        component={LinkedDevicesScreen}
        options={{ title: 'Linked Devices' }}
      />
      <Stack.Screen
        name="Backup"
        component={BackupScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <CurvedTabBar
          {...props}
          onCenterPress={() => {
            props.navigation.navigate('Chats', { screen: 'NewConversation' });
          }}
        />
      )}
    >
      <Tab.Screen name="Chats" component={ConversationsStack} />
      <Tab.Screen name="Updates" component={UpdatesStack} />
      <Tab.Screen name="Communities" component={CommunitiesStack} />
      <Tab.Screen name="Calls" component={CallsStack} />
    </Tab.Navigator>
  );
}
