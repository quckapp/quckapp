import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { initiateCall } from '../../store/slices/callSlice';
import { fetchCalls } from '../../store/slices/callsHistorySlice';

interface CallParticipant {
  userId: string | {
    _id: string;
    displayName?: string;
    phoneNumber?: string;
    avatar?: string;
  };
  joinedAt?: Date;
  leftAt?: Date;
  isInitiator: boolean;
}

interface CallLog {
  _id: string;
  conversationId?: string;
  initiatorId: string | {
    _id: string;
    displayName?: string;
    phoneNumber?: string;
    avatar?: string;
  };
  initiator?: {
    _id: string;
    phoneNumber: string;
    displayName?: string;
    avatar?: string;
  };
  type: 'audio' | 'video';
  status: 'ongoing' | 'completed' | 'missed' | 'rejected' | 'failed';
  participants: CallParticipant[];
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  createdAt: string;
  isGroupCall?: boolean;
  recipient?: {
    _id: string;
    phoneNumber: string;
    displayName?: string;
    avatar?: string;
  };
}

type MainTab = 'all' | 'huddle' | 'regular';
type CallFilter = 'all' | 'incoming' | 'outgoing' | 'missed';

interface CallSection {
  title: string;
  data: CallLog[];
}

export default function CallsScreen({ navigation }: any) {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { calls, loading } = useSelector((state: RootState) => state.callsHistory);
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('all');
  const [callFilter, setCallFilter] = useState<CallFilter>('all');

  useEffect(() => {
    loadCalls();
  }, []);


  const loadCalls = async () => {
    try {
      await dispatch(fetchCalls()).unwrap();
    } catch (error) {
      console.error('Error fetching call logs:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCalls();
  };

  const handleCall = (userId: string, type: 'audio' | 'video') => {
    dispatch(initiateCall({ userId, type }));
  };

  const formatCallTime = (date: string) => {
    const callDate = new Date(date);
    return format(callDate, 'HH:mm');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    if (mins === 0) {
      return `${secs}s`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine call direction
  // Outgoing: I initiated the call
  // Incoming: Someone called me and I answered
  // Missed: Someone called me but I didn't answer
  const getCallDirection = (call: CallLog): 'incoming' | 'outgoing' | 'missed' => {
    // Handle initiatorId being either a string ID or a populated object
    const initiatorId = typeof call.initiatorId === 'object'
      ? (call.initiatorId as any)?._id
      : call.initiatorId;

    const isInitiator = initiatorId === currentUser?._id;

    // If I initiated the call, it's always outgoing
    if (isInitiator) return 'outgoing';

    // I received the call - check if I answered or missed it
    const missedStatuses = ['missed', 'rejected', 'failed'];
    if (missedStatuses.includes(call.status)) {
      return 'missed';
    }

    // I received and answered the call
    return 'incoming';
  };

  const getCallIcon = (call: CallLog) => {
    const direction = getCallDirection(call);

    switch (direction) {
      case 'missed':
        return { name: 'arrow-down', color: '#FF3B30', rotation: 45 };
      case 'incoming':
        return { name: 'arrow-down', color: '#34C759', rotation: 0 };
      case 'outgoing':
        return { name: 'arrow-up', color: theme.primary, rotation: 0 };
      default:
        return { name: 'call-outline', color: theme.textSecondary, rotation: 0 };
    }
  };

  // Get the other party's info
  const getContactInfo = (call: CallLog) => {
    // Handle initiatorId being either a string ID or a populated object
    const initiatorId = typeof call.initiatorId === 'object'
      ? (call.initiatorId as any)?._id
      : call.initiatorId;

    const isOutgoing = initiatorId === currentUser?._id;

    if (isOutgoing) {
      // For outgoing calls, find the recipient from participants (non-initiator)
      // First check if recipient field exists
      if (call.recipient) {
        return {
          _id: call.recipient._id,
          displayName: call.recipient.displayName || call.recipient.phoneNumber || 'Unknown',
          phoneNumber: call.recipient.phoneNumber,
          avatar: call.recipient.avatar,
        };
      }

      // Otherwise find from participants array
      const recipient = call.participants?.find(p => {
        const participantUserId = typeof p.userId === 'object'
          ? (p.userId as any)?._id
          : p.userId;
        return participantUserId !== currentUser?._id && !p.isInitiator;
      });

      if (recipient) {
        // Handle populated userId
        const userInfo = typeof recipient.userId === 'object'
          ? recipient.userId as any
          : null;

        if (userInfo) {
          return {
            _id: userInfo._id,
            displayName: userInfo.displayName || userInfo.phoneNumber || 'Unknown',
            phoneNumber: userInfo.phoneNumber,
            avatar: userInfo.avatar,
          };
        }
      }

      return {
        _id: 'unknown',
        displayName: 'Unknown',
        phoneNumber: '',
        avatar: undefined,
      };
    }

    // For incoming/missed calls, use initiator info (the caller)
    // If initiatorId is a populated object, use it directly
    const contact = typeof call.initiatorId === 'object'
      ? call.initiatorId as any
      : call.initiator || {
          _id: initiatorId,
          displayName: 'Unknown',
          phoneNumber: '',
        };

    return {
      _id: contact._id || initiatorId,
      displayName: contact.displayName || contact.phoneNumber || 'Unknown',
      phoneNumber: contact.phoneNumber,
      avatar: contact.avatar,
    };
  };

  // Separate calls into regular calls and huddles
  const regularCalls = useMemo(() => calls.filter(call => !call.isGroupCall), [calls]);
  const huddleCalls = useMemo(() => calls.filter(call => call.isGroupCall), [calls]);

  // Get calls based on main tab
  const getCallsByMainTab = (tab: MainTab) => {
    switch (tab) {
      case 'huddle':
        return huddleCalls;
      case 'regular':
        return regularCalls;
      default:
        return calls;
    }
  };

  // Apply direction filter
  const applyDirectionFilter = (callList: CallLog[], filter: CallFilter) => {
    if (filter === 'all') return callList;

    return callList.filter(call => {
      const direction = getCallDirection(call);
      return direction === filter;
    });
  };

  // Get filtered calls
  const filteredCalls = useMemo(() => {
    const tabCalls = getCallsByMainTab(mainTab);
    return applyDirectionFilter(tabCalls, callFilter);
  }, [calls, mainTab, callFilter, currentUser?._id]);

  // Count calls by direction for current main tab
  const getDirectionCounts = (callList: CallLog[]) => {
    const counts = { all: callList.length, incoming: 0, outgoing: 0, missed: 0 };

    callList.forEach(call => {
      const direction = getCallDirection(call);
      counts[direction]++;
    });

    return counts;
  };

  const directionCounts = useMemo(() => {
    const tabCalls = getCallsByMainTab(mainTab);
    return getDirectionCounts(tabCalls);
  }, [calls, mainTab, currentUser?._id]);

  // Group calls into sections by date
  const sections = useMemo((): CallSection[] => {
    const today: CallLog[] = [];
    const yesterday: CallLog[] = [];
    const thisWeek: CallLog[] = [];
    const older: CallLog[] = [];

    filteredCalls.forEach(call => {
      const callDate = new Date(call.createdAt);

      if (isToday(callDate)) {
        today.push(call);
      } else if (isYesterday(callDate)) {
        yesterday.push(call);
      } else if (isThisWeek(callDate)) {
        thisWeek.push(call);
      } else {
        older.push(call);
      }
    });

    const result: CallSection[] = [];
    if (today.length > 0) result.push({ title: 'Today', data: today });
    if (yesterday.length > 0) result.push({ title: 'Yesterday', data: yesterday });
    if (thisWeek.length > 0) result.push({ title: 'This Week', data: thisWeek });
    if (older.length > 0) result.push({ title: 'Earlier', data: older });

    return result;
  }, [filteredCalls]);

  const renderCallLog = ({ item }: { item: CallLog }) => {
    const contact = getContactInfo(item);
    const callIcon = getCallIcon(item);
    const direction = getCallDirection(item);
    const isHuddle = item.isGroupCall === true;
    const participantCount = item.participants?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.callItem, { backgroundColor: theme.background }]}
        onPress={() => {
          Alert.alert(
            'Call',
            `Call ${contact.displayName}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Audio Call',
                onPress: () => handleCall(contact._id, 'audio'),
              },
              {
                text: 'Video Call',
                onPress: () => handleCall(contact._id, 'video'),
              },
            ]
          );
        }}
      >
        <View style={styles.avatarContainer}>
          {isHuddle ? (
            <View style={[styles.avatar, styles.huddleAvatar, { backgroundColor: theme.primary }]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
          ) : contact.avatar ? (
            <Image
              source={{ uri: contact.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {contact.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Call direction indicator */}
          <View style={[styles.directionBadge, { backgroundColor: callIcon.color }]}>
            <Ionicons
              name={callIcon.name as any}
              size={10}
              color="#fff"
              style={{ transform: [{ rotate: `${callIcon.rotation}deg` }] }}
            />
          </View>
        </View>

        <View style={styles.callInfo}>
          <View style={styles.callHeader}>
            <View style={styles.nameContainer}>
              <Text style={[
                styles.contactName,
                { color: direction === 'missed' ? '#FF3B30' : theme.text }
              ]}>
                {isHuddle ? `Huddle (${participantCount})` : contact.displayName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCall(contact._id, item.type)}
              style={styles.callButton}
            >
              <Ionicons
                name={item.type === 'video' ? 'videocam' : 'call'}
                size={22}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.callDetails}>
            <View style={styles.callMeta}>
              {/* Direction label */}
              <View style={[
                styles.directionLabel,
                { backgroundColor: callIcon.color + '15' }
              ]}>
                <Ionicons
                  name={callIcon.name as any}
                  size={12}
                  color={callIcon.color}
                  style={{ transform: [{ rotate: `${callIcon.rotation}deg` }] }}
                />
                <Text style={[styles.directionText, { color: callIcon.color }]}>
                  {direction === 'outgoing' ? 'Outgoing' : direction === 'incoming' ? 'Incoming' : 'Missed'} ({item.status})
                </Text>
              </View>
              <Text style={[styles.separator, { color: theme.textTertiary }]}>•</Text>
              <Text style={[styles.callType, { color: theme.textSecondary }]}>
                {item.type === 'video' ? 'Video' : 'Audio'}
              </Text>
              <Text style={[styles.separator, { color: theme.textTertiary }]}>•</Text>
              <Text style={[styles.callTime, { color: theme.textSecondary }]}>
                {formatCallTime(item.createdAt)}
              </Text>
              {item.duration > 0 && (
                <>
                  <Text style={[styles.separator, { color: theme.textTertiary }]}>•</Text>
                  <Text style={[styles.duration, { color: theme.textSecondary }]}>
                    {formatDuration(item.duration)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: CallSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.backgroundSecondary }]}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionCount, { color: theme.textTertiary }]}>
        {section.data.length} {section.data.length === 1 ? 'call' : 'calls'}
      </Text>
    </View>
  );

  const getEmptyStateContent = () => {
    const mainLabels = { all: '', huddle: 'huddle ', regular: 'regular ' };
    const filterLabels = { all: 'calls', incoming: 'incoming calls', outgoing: 'outgoing calls', missed: 'missed calls' };

    const mainLabel = mainLabels[mainTab];
    const filterLabel = filterLabels[callFilter];

    return {
      icon: callFilter === 'missed' ? 'close-circle-outline' :
            callFilter === 'incoming' ? 'arrow-down' :
            callFilter === 'outgoing' ? 'arrow-up' :
            mainTab === 'huddle' ? 'people-outline' : 'call-outline',
      title: `No ${mainLabel}${filterLabel}`,
      subtitle: `Your ${mainLabel}${filterLabel} will appear here`,
    };
  };

  const renderEmptyState = () => {
    const content = getEmptyStateContent();
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons
            name={content.icon as any}
            size={48}
            color={theme.disabled}
          />
        </View>
        <Text style={[styles.emptyText, { color: theme.text }]}>
          {content.title}
        </Text>
        <Text style={[styles.emptySubText, { color: theme.textTertiary }]}>
          {content.subtitle}
        </Text>
      </View>
    );
  };

  if (loading && calls.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const mainTabs: { key: MainTab; label: string; icon: string; count: number }[] = [
    { key: 'all', label: 'All', icon: 'apps-outline', count: calls.length },
    { key: 'huddle', label: 'Huddle', icon: 'people-outline', count: huddleCalls.length },
    { key: 'regular', label: 'Regular', icon: 'call-outline', count: regularCalls.length },
  ];

  const directionFilters: { key: CallFilter; label: string; icon: string; color?: string }[] = [
    { key: 'all', label: 'All', icon: 'time-outline' },
    { key: 'incoming', label: 'Incoming', icon: 'arrow-down', color: '#34C759' },
    { key: 'outgoing', label: 'Outgoing', icon: 'arrow-up' },
    { key: 'missed', label: 'Missed', icon: 'close-circle-outline', color: '#FF3B30' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Main Tabs: All / Huddle / Regular */}
      <View style={[styles.mainTabsContainer, { borderBottomColor: theme.border }]}>
        {mainTabs.map((tab) => {
          const isActive = mainTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.mainTab,
                isActive && [styles.mainTabActive, { borderBottomColor: theme.primary }]
              ]}
              onPress={() => {
                setMainTab(tab.key);
                setCallFilter('all'); // Reset sub-filter when changing main tab
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={isActive ? theme.primary : theme.textSecondary}
              />
              <Text style={[
                styles.mainTabText,
                { color: isActive ? theme.primary : theme.textSecondary }
              ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[
                  styles.mainCountBadge,
                  { backgroundColor: isActive ? theme.primary : theme.backgroundSecondary }
                ]}>
                  <Text style={[
                    styles.mainCountText,
                    { color: isActive ? '#fff' : theme.textSecondary }
                  ]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sub-filters: All / Incoming / Outgoing / Missed */}
      <View style={[styles.subFilterContainer, { backgroundColor: theme.background }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterContent}
        >
          {directionFilters.map((filter) => {
            const isActive = callFilter === filter.key;
            const count = directionCounts[filter.key];
            const filterColor = filter.color || theme.primary;

            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.subFilterButton,
                  { borderColor: isActive ? filterColor : theme.border },
                  isActive && { backgroundColor: filterColor }
                ]}
                onPress={() => setCallFilter(filter.key)}
              >
                <Ionicons
                  name={filter.icon as any}
                  size={14}
                  color={isActive ? '#fff' : (filter.color || theme.textSecondary)}
                />
                <Text style={[
                  styles.subFilterText,
                  { color: isActive ? '#fff' : (filter.color || theme.text) }
                ]}>
                  {filter.label}
                </Text>
                {count > 0 && (
                  <View style={[
                    styles.subCountBadge,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : theme.backgroundSecondary }
                  ]}>
                    <Text style={[
                      styles.subCountText,
                      { color: isActive ? '#fff' : theme.textSecondary }
                    ]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Call List with Sections */}
      <SectionList
        sections={sections}
        renderItem={renderCallLog}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
        ListEmptyComponent={renderEmptyState()}
        stickySectionHeadersEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Main tabs styles
  mainTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabActive: {
    borderBottomWidth: 2,
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mainCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  mainCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Sub-filter styles
  subFilterContainer: {
    paddingVertical: 10,
  },
  subFilterContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  subFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  subFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  subCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
  },
  // Call item styles
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  huddleAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  directionBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  callInfo: {
    flex: 1,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  callButton: {
    padding: 8,
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  directionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  callType: {
    fontSize: 13,
  },
  separator: {
    marginHorizontal: 6,
  },
  callTime: {
    fontSize: 13,
  },
  duration: {
    fontSize: 13,
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
