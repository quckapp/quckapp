import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { analyticsApi } from '../../services/analytics';
import type {
  AnalyticsOverview,
  TopActiveUser,
  MessageTypeDistribution,
  ConversationStats,
  EngagementMetrics,
} from '../../services/analytics';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topUsers, setTopUsers] = useState<TopActiveUser[]>([]);
  const [messageTypes, setMessageTypes] = useState<MessageTypeDistribution[]>([]);
  const [conversationStats, setConversationStats] = useState<ConversationStats | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [
        overviewData,
        topUsersData,
        messageTypesData,
        conversationStatsData,
        engagementData,
      ] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getTopActiveUsers(5),
        analyticsApi.getMessageTypeDistribution(),
        analyticsApi.getConversationStats(),
        analyticsApi.getEngagementMetrics(),
      ]);

      setOverview(overviewData);
      setTopUsers(topUsersData);
      setMessageTypes(messageTypesData);
      setConversationStats(conversationStatsData);
      setEngagement(engagementData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const StatCard = ({ icon, title, value, subtitle, color }: any) => (
    <View style={[styles.statCard, { backgroundColor: theme.background }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );

  const SectionHeader = ({ title, icon }: any) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={theme.primary} />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );

  if (loading && !overview) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      {/* Overview Section */}
      <View style={styles.section}>
        <SectionHeader title="Overview" icon="stats-chart" />
        <View style={styles.statsGrid}>
          <StatCard
            icon="people"
            title="Total Users"
            value={overview?.users.total || 0}
            subtitle={`${overview?.users.activeToday || 0} active today`}
            color="#4CAF50"
          />
          <StatCard
            icon="person-add"
            title="New This Week"
            value={overview?.users.newThisWeek || 0}
            subtitle={`${overview?.users.newToday || 0} today`}
            color="#2196F3"
          />
          <StatCard
            icon="chatbubbles"
            title="Total Messages"
            value={overview?.messages.total || 0}
            subtitle={`${overview?.messages.today || 0} today`}
            color="#FF9800"
          />
          <StatCard
            icon="trending-up"
            title="Avg Per Day"
            value={overview?.messages.avgPerDay || 0}
            subtitle={`${overview?.messages.thisWeek || 0} this week`}
            color="#9C27B0"
          />
        </View>
      </View>

      {/* Engagement Section */}
      {engagement && (
        <View style={styles.section}>
          <SectionHeader title="Engagement" icon="pulse" />
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            <View style={styles.engagementRow}>
              <View style={styles.engagementItem}>
                <Text style={[styles.engagementValue, { color: theme.text }]}>
                  {engagement.engagementRate}%
                </Text>
                <Text style={[styles.engagementLabel, { color: theme.textSecondary }]}>
                  Engagement Rate
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.engagementItem}>
                <Text style={[styles.engagementValue, { color: theme.text }]}>
                  {engagement.avgMessagesPerActiveUser}
                </Text>
                <Text style={[styles.engagementLabel, { color: theme.textSecondary }]}>
                  Avg Messages/User
                </Text>
              </View>
            </View>
            <View style={[styles.engagementFooter, { borderTopColor: theme.border }]}>
              <Text style={[styles.engagementFooterText, { color: theme.textTertiary }]}>
                {engagement.activeUserCount} of {engagement.totalUsers} users active in last 7 days
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Conversations Section */}
      {conversationStats && (
        <View style={styles.section}>
          <SectionHeader title="Conversations" icon="chatbubble-ellipses" />
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            <View style={styles.conversationRow}>
              <View style={styles.conversationItem}>
                <Ionicons name="person" size={32} color={theme.primary} />
                <Text style={[styles.conversationValue, { color: theme.text }]}>
                  {conversationStats.direct}
                </Text>
                <Text style={[styles.conversationLabel, { color: theme.textSecondary }]}>
                  Direct
                </Text>
              </View>
              <View style={styles.conversationItem}>
                <Ionicons name="people" size={32} color={theme.success} />
                <Text style={[styles.conversationValue, { color: theme.text }]}>
                  {conversationStats.group}
                </Text>
                <Text style={[styles.conversationLabel, { color: theme.textSecondary }]}>
                  Group
                </Text>
              </View>
              <View style={styles.conversationItem}>
                <Ionicons name="stats-chart" size={32} color="#FF9800" />
                <Text style={[styles.conversationValue, { color: theme.text }]}>
                  {conversationStats.averageParticipants}
                </Text>
                <Text style={[styles.conversationLabel, { color: theme.textSecondary }]}>
                  Avg Size
                </Text>
              </View>
            </View>
            <View style={[styles.conversationFooter, { borderTopColor: theme.border }]}>
              <Text style={[styles.conversationTotal, { color: theme.text }]}>
                {conversationStats.total}
              </Text>
              <Text style={[styles.conversationTotalLabel, { color: theme.textSecondary }]}>
                Total Conversations
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Message Types Section */}
      {messageTypes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Message Types" icon="document-text" />
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            {messageTypes.map((type, index) => (
              <View
                key={type.type}
                style={[
                  styles.messageTypeItem,
                  index < messageTypes.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <View style={styles.messageTypeLeft}>
                  <Ionicons
                    name={
                      type.type === 'text'
                        ? 'text'
                        : type.type === 'image'
                        ? 'image'
                        : type.type === 'video'
                        ? 'videocam'
                        : type.type === 'audio'
                        ? 'musical-notes'
                        : 'document'
                    }
                    size={24}
                    color={theme.primary}
                  />
                  <Text style={[styles.messageTypeLabel, { color: theme.text }]}>
                    {type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                  </Text>
                </View>
                <View style={styles.messageTypeRight}>
                  <Text style={[styles.messageTypeCount, { color: theme.text }]}>
                    {type.count}
                  </Text>
                  <Text style={[styles.messageTypePercentage, { color: theme.textSecondary }]}>
                    ({type.percentage}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Top Active Users Section */}
      {topUsers.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Most Active Users" icon="trophy" />
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            {topUsers.map((user, index) => (
              <View
                key={user._id}
                style={[
                  styles.topUserItem,
                  index < topUsers.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <View style={styles.topUserLeft}>
                  <View
                    style={[
                      styles.topUserRank,
                      {
                        backgroundColor:
                          index === 0
                            ? '#FFD700'
                            : index === 1
                            ? '#C0C0C0'
                            : index === 2
                            ? '#CD7F32'
                            : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.topUserRankText,
                        { color: index < 3 ? '#fff' : theme.text },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.topUserName, { color: theme.text }]}>
                      {user.displayName}
                    </Text>
                    <Text style={[styles.topUserUsername, { color: theme.textTertiary }]}>
                      @{user.username}
                    </Text>
                  </View>
                </View>
                <View style={styles.topUserRight}>
                  <Text style={[styles.topUserMessages, { color: theme.primary }]}>
                    {user.messageCount}
                  </Text>
                  <Text style={[styles.topUserMessagesLabel, { color: theme.textSecondary }]}>
                    messages
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: (width - 44) / 2,
    margin: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 40,
  },
  engagementValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  engagementLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  engagementFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  engagementFooterText: {
    fontSize: 13,
    textAlign: 'center',
  },
  conversationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  conversationItem: {
    alignItems: 'center',
  },
  conversationValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  conversationLabel: {
    fontSize: 13,
  },
  conversationFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  conversationTotal: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  conversationTotalLabel: {
    fontSize: 14,
  },
  messageTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  messageTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  messageTypeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTypeCount: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  messageTypePercentage: {
    fontSize: 14,
  },
  topUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  topUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topUserRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topUserRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  topUserName: {
    fontSize: 16,
    fontWeight: '600',
  },
  topUserUsername: {
    fontSize: 13,
    marginTop: 2,
  },
  topUserRight: {
    alignItems: 'flex-end',
  },
  topUserMessages: {
    fontSize: 18,
    fontWeight: '700',
  },
  topUserMessagesLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
});
