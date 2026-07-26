export { todoSchema, type Todo } from "./domain/todo";
export { memoSchema, type Memo } from "./domain/memo";
export { profileSchema, type Profile } from "./domain/profile";
export { duckStateSchema, type DuckState } from "./domain/duck-state";
export {
  contributionDaySchema,
  contributionSummarySchema,
  type ContributionDay,
  type ContributionSummary,
} from "./domain/github-contribution";
export {
  activitySourceSchema,
  activityDailyEntrySchema,
  type ActivitySource,
  type ActivityDailyEntry,
} from "./domain/activity-daily";
export {
  DUCK_MOODS,
  STALE_COMMIT_DAYS,
  deriveDuckMood,
  daysSinceLastCommit,
  type DuckMood,
  type DuckMoodInput,
  type TodayTodoTally,
} from "./domain/duck-mood";
export {
  epochDay,
  toLocalDateString,
  kstDateString,
  startOfWeek,
} from "./domain/date-util";
export {
  DAY_CODES,
  parseRecurrence,
  serializeRecurrence,
  nextOccurrence,
  describeRecurrence,
  type RecurrenceRule,
} from "./domain/recurrence";
export { rolloverDueDate } from "./domain/recurrence-rollover";
export { isQuietHour } from "./domain/quiet-hours";
export { nextDailyCount, type DailyCount } from "./domain/notify-budget";
export {
  XP_REWARDS,
  XP_PER_LEVEL_BASE,
  FEED_PER_XP,
  FEED_MAX,
  type XpSource,
} from "./domain/balance";
export {
  xpForLevel,
  deriveLevel,
  xpAfterAward,
  levelProgress,
} from "./domain/duck-xp";
export {
  habitSchema,
  habitCheckSchema,
  deriveHabitStreak,
  type Habit,
  type HabitCheck,
} from "./domain/habit";
export {
  pomodoroSessionSchema,
  type PomodoroSession,
} from "./domain/pomodoro";
export {
  calendarEventSchema,
  daysUntil,
  type CalendarEvent,
} from "./domain/calendar-event";
export {
  LddError,
  isLddError,
  toLddError,
  userMessage,
  type LddErrorCode,
} from "./domain/ldd-error";
export {
  quotaWindow,
  quotaWindowMessage,
  type QuotaWindow,
} from "./domain/quota";
export { todoEmbedText, calendarEventEmbedText } from "./domain/embed-text";
export {
  selectTodosForDuck,
  DUCK_TODO_LIMIT,
  type DuckTodoFilter,
} from "./domain/todo-query";
export {
  selectEventsForDuck,
  DUCK_EVENT_LIMIT,
  type DuckEventFilter,
} from "./domain/event-query";
export {
  summarizeHabitsForDuck,
  DUCK_HABIT_RANGE_DAYS,
  type DuckHabitSummary,
} from "./domain/habit-query";
export {
  EMBEDDING_DIM,
  embeddingSourceSchema,
  embeddingChunkSchema,
  retrievedChunkSchema,
  chunkText,
  type EmbeddingSource,
  type EmbeddingChunk,
  type RetrievedChunk,
} from "./domain/embedding";
export {
  chatRoleSchema,
  chatMessageSchema,
  routeUtterance,
  ruleReply,
  buildRagContext,
  buildRagPrompt,
  type ChatRole,
  type ChatMessage,
  type UtteranceRoute,
} from "./domain/ai-chat";
export {
  pageSchema,
  pageVersionSchema,
  extractPlainText,
  type Page,
  type PageLink,
  type PageVersion,
} from "./domain/page";
export { pageStats, type PageStats } from "./domain/page-stats";
export {
  publicPageMetaCopy,
  PUBLIC_PAGE_META_LIMITS,
} from "./domain/public-page-meta";
export { resolveSiteUrl, type SiteUrlEnv } from "./domain/site-url";
export {
  digestWeekKey,
  previousWeekRange,
  shouldCreateDigest,
  formatWeeklyDigestLines,
  weeklyDigestTitle,
  type DigestRange,
} from "./domain/weekly-digest";
export { rowsToCsv } from "./domain/db-export";
export {
  dashboardSummary,
  pomodoroStats,
  habitHeatmapData,
  type DashboardInput,
  type DashboardSummary,
  type PomodoroStats,
  type HeatmapDay,
} from "./domain/dashboard";
export {
  WRITE_ACTIONS,
  WRITE_INPUT_MAX,
  writeActionSchema,
  buildWriteAssistPrompt,
  type WriteAction,
} from "./domain/ai-write";
export {
  PROPERTY_TYPES,
  VIEW_TYPES,
  SELECT_COLORS,
  ROW_VALUE_MAX,
  MAX_PROPERTIES,
  MAX_VIEWS,
  MAX_ROW_PROPS,
  MAX_FILTERS,
  FILTER_OPS,
  TITLE_PROP_ID,
  propertyTypeSchema,
  selectOptionSchema,
  propertyDefSchema,
  viewTypeSchema,
  sortSpecSchema,
  filterOpSchema,
  filterSpecSchema,
  viewDefSchema,
  dbSchemaSchema,
  rowPropValueSchema,
  rowPropsSchema,
  createDefaultDbSchema,
  coerceRowPropValue,
  groupRowsByProperty,
  sortRows,
  filterRows,
  type PropertyType,
  type SelectColor,
  type SelectOption,
  type PropertyDef,
  type ViewType,
  type SortSpec,
  type FilterOp,
  type FilterSpec,
  type ViewDef,
  type DbSchema,
  type RowPropValue,
  type RowProps,
  type RowGroup,
  type DbRowLike,
} from "./domain/database-view";
export {
  AGENT_MAX_ITERATIONS,
  toolKindSchema,
  jsonSchemaTypeSchema,
  toolParameterSchema,
  toolDeclarationSchema,
  toolCallSchema,
  toolResultSchema,
  requiresApproval,
  partitionToolCalls,
  type ToolKind,
  type JsonSchemaType,
  type ToolParameterSchema,
  type ToolDeclaration,
  type ToolCall,
  type ToolResult,
} from "./domain/agent-tool";
export {
  googleOAuthTokenSchema,
  type GoogleOAuthToken,
} from "./domain/google-oauth-token";
export {
  githubOAuthTokenSchema,
  type GithubOAuthToken,
} from "./domain/github-oauth-token";
export {
  gmailOAuthTokenSchema,
  type GmailOAuthToken,
} from "./domain/gmail-oauth-token";
export {
  actionLogEntrySchema,
  summarizeForLog,
  type ActionLogEntry,
} from "./domain/action-log";
export {
  feedSchema,
  articleSchema,
  parseRssItems,
  FEED_FAIL_THRESHOLD,
  type Feed,
  type Article,
  type RssItem,
} from "./domain/news";
export {
  COMMON_FEED_PATHS,
  RECOMMENDED_FEEDS,
  feedTopics,
  resolveFeedUrl,
  unregisteredFeeds,
  type FeedResolution,
  type RecommendedFeed,
} from "./domain/news-feeds";
export {
  tokenizeForCluster,
  clusterArticles,
  type ClusterableArticle,
  type ArticleCluster,
} from "./domain/news-cluster";
export {
  topArticles,
  type RankableArticle,
  type RankedArticle,
  type TopArticlesOptions,
} from "./domain/news-top";
export {
  officeEventSchema,
  eventToState,
  parseOfficeEvents,
  OFFICE_ROLES,
  DUCK_STATES,
  type OfficeEvent,
  type OfficeRole,
  type DuckWorkState,
} from "./domain/office-event";
export {
  movePlayer,
  isAdjacent,
  describeActivity,
  deskSlots,
  type Vec,
  type Dir,
} from "./domain/office-play";
export {
  formatStandupPrompt,
  hasActivity,
  standupInputSchema,
  type StandupInput,
} from "./domain/standup";
export {
  createCamera,
  followTarget,
  worldToScreen,
  screenToWorld,
  visibleTileRange,
  type Camera,
} from "./domain/office-camera";
export {
  TileType,
  createTileMap,
  getTile,
  setTile,
  isSolid,
  isBlocked,
  getZoneAt,
  fillRect,
  strokeRect,
  type TileTypeValue,
  type Zone,
  type TileMap,
} from "./domain/office-tilemap";
export {
  buildOfficeMap,
  stampRoom,
  connectCorridor,
} from "./domain/office-map-builder";
export {
  deptColor,
  deptLabel,
  schedulePhaseLabel,
  npcStatusLabel,
} from "./domain/office-label";
export {
  DEPARTMENTS,
  DEPT_REGISTRY,
  DUCK_NAMES,
  getDepartment,
  type DepartmentId,
  type DuckAccessory,
  type Department,
} from "./domain/office-department";
export {
  OFFICE_CHARACTERS,
  CHAR_FRAME_W,
  CHAR_FRAME_H,
  CHAR_FRAMES_PER_DIR,
  CHAR_DIR_ORDER,
  charDirSlot,
  charSourceX,
  characterSheetFileName,
  assignLook,
  type OfficeCharacterId,
  type CharFacing,
  type CharAnim,
  type CharacterLook,
} from "./domain/office-character";
export {
  createGameClock,
  gameClockFromHm,
  tickClock,
  formatClockTime,
  schedulePhase,
  phaseToWorkState,
  npcWorkState,
  hasActiveWork,
  pickWanderTarget,
  wanderZone,
  type NpcTask,
  type NpcSchedulePhase,
  type Npc,
  type GameClock,
} from "./domain/office-npc";
export { findPath } from "./domain/office-pathfind";
export {
  mapWorkspaceToOfficeTasks,
  OFFICE_TASK_LIMITS,
  type OfficeTask,
} from "./domain/office-tasks";
export {
  timeOfDay,
  timeOverlay,
  shouldWindowsGlow,
  timeOfDayLabel,
  timeOfDayIcon,
  type TimeOfDay,
} from "./domain/office-time";
export {
  createCompany,
  tickCompany,
  recordTaskCompletion,
  formatMoney,
  reputationStars,
  type CompanyStats,
  type EmployeeStats,
} from "./domain/office-company";
export { pageEmbedText } from "./domain/page-embed";
export {
  ROLES,
  DEFAULT_ROLE,
  FEATURES,
  roleSchema,
  parseRole,
  isFeatureKey,
  parseDisabledFeatures,
  canUseFeature,
  canAdminister,
  roleLabel,
  type Role,
  type FeatureKey,
  type Access,
} from "./domain/access";
export {
  EMPTY_LAYOUT,
  parseDashboardLayout,
  resolveOrder,
  isHidden,
  toggleHidden,
  moveWidget,
  visibleWidgets,
  type DashboardLayout,
} from "./domain/dashboard-layout";
export {
  LOG_KIND_LABELS,
  logKind,
  logName,
  summarizeLogs,
  summarizeVisits,
  type LogKind,
  type LogEntryLike,
  type LogStats,
  type LogCount,
  type VisitStats,
} from "./domain/log-stats";
export {
  BACKUP_FORMAT_VERSION,
  buildBackup,
  type Backup,
  type BackupCollections,
  type BackupCollectionKey,
} from "./domain/backup";
export {
  AGGREGATIONS,
  aggregationKindSchema,
  aggregationLabel,
  aggregationsForType,
  computeAggregation,
  formatAggregation,
  type AggregationKind,
  type AggregationRow,
} from "./domain/database-aggregation";
export {
  MAX_SLIDES,
  splitIntoSlides,
  slideTitle,
  type Slide,
} from "./domain/slides";
export {
  ACCOUNT_DELETE_STEPS,
  ACCOUNT_DELETE_PHRASE,
  CONTENT_DELETE_PHRASE,
  accountDeletionEnabled,
  type AccountDeleteStep,
} from "./domain/account-deletion";
export { pendingMigrationMessage } from "./domain/pending-migration";
export { untrustedTextRule } from "./domain/untrusted-text";
export { buildArticleSummaryPrompt } from "./domain/news-summary-prompt";
export { parseBackup, type BackupParseResult } from "./domain/backup-parse";
export {
  LOCAL_PREF_SPECS,
  LOCAL_PREF_LIST_CAP,
  collectLocalPrefs,
  parseLocalPrefs,
  planLocalPrefsRestore,
  type LocalPrefs,
  type LocalPrefValue,
  type LocalPrefSpec,
  type QuietHoursPref,
} from "./domain/local-prefs";
export {
  planRestore,
  orderPagesParentsFirst,
  type RestorePlan,
} from "./domain/backup-restore-plan";
export {
  INITIATIVE_DAILY_CAP,
  buildInitiatives,
  pickInitiative,
  type InitiativeKind,
  type InitiativeCandidate,
  type InitiativeInput,
  type InitiativeState,
} from "./domain/duck-initiative";
export {
  findResumablePomodoro,
  type ResumablePomodoro,
} from "./domain/pomodoro-resume";
export {
  TEMPLATE_FILE_VERSION,
  IMPORTABLE_BLOCK_TYPES,
  buildTemplateFile,
  parseTemplateFile,
  type TemplateFile,
  type TemplateParseResult,
} from "./domain/template-file";
