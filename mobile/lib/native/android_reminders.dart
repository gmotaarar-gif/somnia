import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import 'reminders.dart';

tz.TZDateTime nextReminderTime(
  tz.Location location,
  DateTime now,
  int hour,
  int minute,
) {
  final local = tz.TZDateTime.from(now, location);
  var next = tz.TZDateTime(
    location,
    local.year,
    local.month,
    local.day,
    hour,
    minute,
  );
  if (!next.isAfter(local)) {
    next = tz.TZDateTime(
      location,
      local.year,
      local.month,
      local.day + 1,
      hour,
      minute,
    );
  }
  return next;
}

class AndroidReminderScheduler implements ReminderScheduler {
  final FlutterLocalNotificationsPlugin plugin =
      FlutterLocalNotificationsPlugin();
  @override
  bool get supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
  @override
  Future<void> initialize(void Function(int) onTap) async {
    tzdata.initializeTimeZones();
    await refreshTimezone();
    await plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('ic_notification'),
      ),
      onDidReceiveNotificationResponse: (response) {
        if (response.id != null) onTap(response.id!);
      },
    );
    final launch = await plugin.getNotificationAppLaunchDetails();
    if (launch?.didNotificationLaunchApp == true &&
        launch?.notificationResponse?.id != null) {
      onTap(launch!.notificationResponse!.id!);
    }
  }

  @override
  Future<void> refreshTimezone() async {
    final zone = await FlutterTimezone.getLocalTimezone();
    tz.setLocalLocation(tz.getLocation(zone.identifier));
  }

  AndroidFlutterLocalNotificationsPlugin get _android => plugin
      .resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin
      >()!;
  @override
  Future<bool> hasPermission() async =>
      await _android.areNotificationsEnabled() ?? false;
  @override
  Future<bool> requestPermission() async =>
      await _android.requestNotificationsPermission() ?? false;
  @override
  Future<void> cancel(int id) => plugin.cancel(id: id);
  @override
  Future<void> schedule(DailyReminder reminder) => plugin.zonedSchedule(
    id: reminder.id,
    title: reminder.title,
    body: reminder.body,
    scheduledDate: nextReminderTime(
      tz.local,
      DateTime.now(),
      reminder.hour,
      reminder.minute,
    ),
    androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
    matchDateTimeComponents: DateTimeComponents.time,
    notificationDetails: const NotificationDetails(
      android: AndroidNotificationDetails(
        'somna-reminders',
        'Напоминания Somna',
        channelDescription: 'Вечерние и утренние напоминания',
        icon: 'ic_notification',
        color: Color(0xffc9b9ef),
        importance: Importance.high,
        priority: Priority.high,
      ),
    ),
  );
}
