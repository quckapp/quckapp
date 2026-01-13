import asyncio
import json
import logging
from typing import Optional, Dict, Any, Callable
from datetime import datetime
import os

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaConnectionError

logger = logging.getLogger(__name__)


class AnalyticsKafkaConsumer:
    """Kafka consumer for ingesting analytics events from other services"""

    def __init__(
        self,
        event_handler: Callable[[str, Dict[str, Any]], Any],
        bootstrap_servers: str = None,
        group_id: str = "analytics-service",
    ):
        self.bootstrap_servers = bootstrap_servers or os.getenv(
            "KAFKA_BROKERS", "localhost:9092"
        )
        self.group_id = group_id
        self.event_handler = event_handler
        self.consumer: Optional[AIOKafkaConsumer] = None
        self._running = False
        self._task: Optional[asyncio.Task] = None

        # Topics to subscribe to
        self.topics = [
            "message-events",
            "call-events",
            "file-events",
            "user-events",
            "workspace-events",
            "channel-events",
            "notification-events",
            "presence-events",
        ]

        # Event type mapping from topic events to analytics events
        self.event_mapping = {
            # Message events
            "message.created": "message.sent",
            "message.read": "message.read",
            "message.deleted": "message.deleted",
            "reaction.added": "message.reaction",
            "reaction.removed": "message.reaction.removed",
            "thread.created": "thread.created",
            "thread.reply": "thread.reply",

            # Call events
            "call.started": "call.started",
            "call.ended": "call.ended",
            "call.joined": "call.joined",
            "call.left": "call.left",
            "huddle.started": "huddle.started",
            "huddle.ended": "huddle.ended",

            # File events
            "file.uploaded": "file.uploaded",
            "file.downloaded": "file.downloaded",
            "file.deleted": "file.deleted",
            "file.shared": "file.shared",

            # User events
            "user.created": "user.signup",
            "user.login": "user.login",
            "user.logout": "user.logout",
            "user.updated": "user.updated",

            # Workspace events
            "workspace.created": "workspace.created",
            "workspace.deleted": "workspace.deleted",
            "workspace.member.joined": "workspace.member.joined",
            "workspace.member.left": "workspace.member.left",
            "workspace.invite": "workspace.invite",

            # Channel events
            "channel.created": "channel.created",
            "channel.deleted": "channel.deleted",
            "channel.member.joined": "channel.member.joined",
            "channel.member.left": "channel.member.left",

            # Presence events
            "presence.online": "user.active",
            "presence.offline": "user.inactive",
            "presence.away": "user.away",
        }

    async def start(self):
        """Start the Kafka consumer"""
        if self._running:
            logger.warning("Kafka consumer already running")
            return

        try:
            self.consumer = AIOKafkaConsumer(
                *self.topics,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                auto_offset_reset="latest",
                enable_auto_commit=True,
                auto_commit_interval_ms=5000,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            )

            await self.consumer.start()
            self._running = True
            logger.info(f"Kafka consumer started, subscribed to topics: {self.topics}")

            # Start consuming in background
            self._task = asyncio.create_task(self._consume_loop())

        except KafkaConnectionError as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            self._running = False
        except Exception as e:
            logger.error(f"Failed to start Kafka consumer: {e}")
            self._running = False

    async def stop(self):
        """Stop the Kafka consumer"""
        self._running = False

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        if self.consumer:
            await self.consumer.stop()
            logger.info("Kafka consumer stopped")

    async def _consume_loop(self):
        """Main consumption loop"""
        try:
            async for message in self.consumer:
                if not self._running:
                    break

                try:
                    await self._process_message(message)
                except Exception as e:
                    logger.error(f"Error processing message: {e}")

        except asyncio.CancelledError:
            logger.info("Kafka consumer loop cancelled")
        except Exception as e:
            logger.error(f"Error in Kafka consumer loop: {e}")

    async def _process_message(self, message):
        """Process a single Kafka message"""
        topic = message.topic
        value = message.value

        if not isinstance(value, dict):
            logger.warning(f"Invalid message format from topic {topic}")
            return

        # Extract event type from message
        event_type = value.get("type") or value.get("event_type")
        if not event_type:
            logger.debug(f"Message without event type from topic {topic}")
            return

        # Map to analytics event type
        analytics_event_type = self.event_mapping.get(event_type, event_type)

        # Extract common fields
        analytics_event = {
            "event_type": analytics_event_type,
            "user_id": value.get("user_id"),
            "workspace_id": value.get("workspace_id"),
            "channel_id": value.get("channel_id"),
            "session_id": value.get("session_id"),
            "source_service": topic.replace("-events", "-service"),
            "properties": {},
            "timestamp": None,
        }

        # Parse timestamp
        timestamp = value.get("timestamp") or value.get("created_at")
        if timestamp:
            if isinstance(timestamp, str):
                try:
                    analytics_event["timestamp"] = datetime.fromisoformat(
                        timestamp.replace("Z", "+00:00")
                    )
                except ValueError:
                    pass
            elif isinstance(timestamp, (int, float)):
                analytics_event["timestamp"] = datetime.fromtimestamp(timestamp)

        # Extract event-specific properties
        analytics_event["properties"] = self._extract_properties(
            event_type, value
        )

        # Send to event handler
        try:
            await self.event_handler(analytics_event_type, analytics_event)
            logger.debug(f"Processed event: {analytics_event_type}")
        except Exception as e:
            logger.error(f"Failed to handle event {analytics_event_type}: {e}")

    def _extract_properties(self, event_type: str, value: Dict[str, Any]) -> Dict[str, Any]:
        """Extract relevant properties based on event type"""
        properties = {}

        # Message events
        if event_type.startswith("message"):
            properties["message_id"] = value.get("message_id") or value.get("id")
            properties["type"] = value.get("message_type", "text")
            if value.get("has_attachments"):
                properties["has_attachments"] = True
            if value.get("is_thread_reply"):
                properties["is_thread"] = True

        # Call events
        elif event_type.startswith("call") or event_type.startswith("huddle"):
            properties["call_id"] = value.get("call_id") or value.get("id")
            properties["type"] = value.get("call_type", "audio")
            if value.get("duration") or value.get("duration_seconds"):
                properties["duration_seconds"] = value.get("duration") or value.get("duration_seconds")
            if value.get("participant_count"):
                properties["participant_count"] = value.get("participant_count")

        # File events
        elif event_type.startswith("file"):
            properties["file_id"] = value.get("file_id") or value.get("id")
            properties["type"] = value.get("mime_type") or value.get("file_type", "unknown")
            if value.get("file_size") or value.get("size"):
                properties["file_size"] = value.get("file_size") or value.get("size")

        # User events
        elif event_type.startswith("user"):
            if value.get("method"):
                properties["method"] = value.get("method")  # e.g., email, oauth
            if value.get("device"):
                properties["device"] = value.get("device")
            if value.get("platform"):
                properties["platform"] = value.get("platform")

        # Workspace events
        elif event_type.startswith("workspace"):
            if value.get("member_count"):
                properties["member_count"] = value.get("member_count")
            if value.get("role"):
                properties["role"] = value.get("role")

        # Channel events
        elif event_type.startswith("channel"):
            properties["channel_type"] = value.get("channel_type", "public")
            if value.get("member_count"):
                properties["member_count"] = value.get("member_count")

        # Presence events
        elif event_type.startswith("presence"):
            if value.get("status"):
                properties["status"] = value.get("status")

        # Include any metadata
        if value.get("metadata"):
            properties["metadata"] = value.get("metadata")

        return properties


async def create_kafka_consumer(event_handler: Callable) -> Optional[AnalyticsKafkaConsumer]:
    """Create and start a Kafka consumer"""
    kafka_enabled = os.getenv("KAFKA_ENABLED", "true").lower() == "true"

    if not kafka_enabled:
        logger.info("Kafka consumer disabled")
        return None

    consumer = AnalyticsKafkaConsumer(event_handler=event_handler)

    try:
        await consumer.start()
        return consumer
    except Exception as e:
        logger.error(f"Failed to create Kafka consumer: {e}")
        return None
