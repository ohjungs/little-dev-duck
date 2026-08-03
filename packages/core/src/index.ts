export { todoSchema, sortTodosByDue, type Todo } from "./domain/todo";
export { memoSchema, type Memo } from "./domain/memo";
export { profileSchema, type Profile } from "./domain/profile";
export { duckStateSchema, type DuckState } from "./domain/duck-state";
export {
  contributionDaySchema,
  contributionSummarySchema,
  contributionsResponseSchema,
  type ContributionDay,
  type ContributionSummary,
  type ContributionsResponse,
} from "./domain/github-contribution";
export { contributionGridLabel } from "./domain/github-contribution-label";
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
  kstHourMinute,
  kstHourOf,
  kstFullDateLabel,
  kstTimeString,
  startOfWeek,
} from "./domain/date-util";
export {
  resolveDateRange,
  dateRangeDays,
  isWithinRange,
  DATE_RANGE_PRESETS,
  DATE_RANGE_LABELS,
  type DateRange,
  type DateRangePreset,
} from "./domain/date-range";
export {
  DAY_CODES,
  parseRecurrence,
  serializeRecurrence,
  nextOccurrence,
  describeRecurrence,
  type RecurrenceRule,
} from "./domain/recurrence";
export { rolloverDueDate } from "./domain/recurrence-rollover";
export { isQuietHour, isQuietNow } from "./domain/quiet-hours";
export { nextDailyCount, type DailyCount } from "./domain/notify-budget";
export {
  shouldNotifyMessage,
  type MessageNotifyMode,
} from "./domain/notify-filter";
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
export { todoEmbedText, calendarEventEmbedText, dbRowEmbedText } from "./domain/embed-text";
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
  clampHistory,
  historyPromptSection,
  historyTurnSchema,
  HISTORY_MAX_TURNS,
  HISTORY_TURN_CHARS,
  type ChatRole,
  type ChatMessage,
  type HistoryTurn,
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
export { rowsToCsv, toCsv } from "./domain/db-export";
export {
  weekdayOf,
  weekdayCounts,
  busiestWeekday,
  WEEKDAY_LABELS,
  type WeekdayCount,
} from "./domain/weekday-stats";
export {
  buildBarChart,
  describeBarChart,
  type BarPoint,
  type BarLayout,
  type ChartScale,
} from "./domain/bar-chart";
export {
  deltaE,
  hexToLab,
  lightness,
  JUST_NOTICEABLE_DELTA_E,
} from "./domain/color-distance";
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
// 2026-08-02 : 스프레드시트 계약 (SPEC-2026-08-02-spreadsheet-a1 T1)
export {
  MAX_ROWS,
  MAX_COLS,
  MAX_CELLS_PER_SHEET,
  MAX_SHEETS_PER_PAGE,
  MAX_FORMULA_LENGTH,
  MAX_CELL_TEXT_LENGTH,
  MAX_SHEET_NAME_LENGTH,
  colToLetters,
  lettersToCol,
  parseCellRef,
  formatCellRef,
  quoteSheetName,
  parseCellRange,
  normalizeRange,
  rangeCellCount,
  cellKey,
  shiftCellRef,
  cellValueSchema,
  cellSchema,
  cellStyleSchema,
  sheetMetaSchema,
  sheetSchema,
  createDefaultSheetMeta,
  nextSheetName,
  isValidSheetName,
  parseCellInput,
  type CellRef,
  type CellRange,
  type CellValue,
  type Cell,
  type CellStyle,
  type SheetMeta,
  type Sheet,
  type CellInput,
} from "./domain/sheet";
// 2026-08-02 : 스프레드시트 수식 파서 (SPEC T2)
export {
  ERROR_VALUES,
  BINARY_OPS,
  isErrorValue,
  tokenize,
  parseFormula,
  formatAst,
  formatFormula,
  collectRefs,
  type ErrorValue,
  type Token,
  type TokenType,
  type Node as FormulaNode,
  type BinaryOp,
  type ParseResult,
  type FormulaRefs,
} from "./domain/formula-parse";
// 2026-08-02 : 스프레드시트 평가기·재계산 (SPEC T3)
export {
  evaluate,
  toNumber as cellToNumber,
  toText as cellToText,
  toBoolean as cellToBoolean,
  toCellValue,
  type EvalValue,
  type EvalResult,
  type EvalContext,
  type FunctionDef,
  type FunctionRegistry,
} from "./domain/formula-eval";
export {
  nodeKey,
  buildGraph,
  directDependents,
  recalc,
  recalcAll,
  type NodeKey,
  type CellData,
  type SheetCells,
  type Workbook,
  type Graph,
  type RecalcResult,
} from "./domain/recalc";
// 2026-08-02 : 스프레드시트 복사·붙여넣기·채우기 (SPEC T6)
export { shiftFormulaRefs } from "./domain/sheet-shift";
export { parseDelimited, toDelimited, UTF8_BOM } from "./domain/sheet-clipboard";
export { fillValues } from "./domain/sheet-fill";
// 2026-08-02 : 스프레드시트 서식 (SPEC T7)
// 2026-08-02 : 스프레드시트 행·열 삽입삭제·정렬 (SPEC T8)
export {
  adjustFormula,
  insertLines,
  deleteLines,
  type Axis as SheetAxisKind,
  type MutateInput,
  type MutateResult,
} from "./domain/sheet-mutate";
export { sortRange, type SortRange } from "./domain/sheet-sort";
export {
  MAX_STYLES,
  applyStyle,
  styleAt,
  displayCellText,
  alignOf,
} from "./domain/sheet-format";
// 2026-08-02 : 스프레드시트 함수 1차 (SPEC T4)
export {
  createFormulaFunctions,
  formulaFunctionNames,
  formatValue as formatCellByCode,
  type FormulaFnOptions,
} from "./domain/formula-fns";
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
  isKoreanEnough,
  type Feed,
  type Article,
  type RssItem,
} from "./domain/news";
export {
  COMMON_FEED_PATHS,
  RECOMMENDED_FEEDS,
  feedTopics,
  topicForUrl,
  resolveFeedUrl,
  unregisteredFeeds,
  rotateRecommended,
  dayOfYearOf,
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
  type TopArticlesResult,
  type TopArticlesEmptyReason,
  type RankableArticle,
  type RankedArticle,
  type TopArticlesOptions,
} from "./domain/news-top";
export {
  dailyIssues,
  briefingRange,
  type BriefingMode,
  type BriefingRange,
  DAILY_ISSUE_LIMIT,
  DAILY_ISSUE_WINDOW_HOURS,
  DAILY_ISSUE_PER_FEED_CAP,
  DAILY_ISSUE_FALLBACK_CATEGORY,
  type DailyIssue,
  type DailyIssuesOptions,
  type DailyIssuesResult,
} from "./domain/news-daily";
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
  bubbleText,
  BUBBLE_MAX_CHARS,
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
  nextZoom,
  OFFICE_ZOOM_LEVELS,
  type OfficeZoom,
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
  OFFICE_TASK_SOURCES,
  departmentsForSource,
  type OfficeTaskSource,
  OFFICE_TASK_LIMITS,
  describeTaskSource,
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
  reorderWidget,
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
  SETTINGS_RESET_PHRASE,
  accountDeletionEnabled,
  type AccountDeleteStep,
} from "./domain/account-deletion";
export { pendingMigrationMessage } from "./domain/pending-migration";
export {
  resolveDisplayName,
  DISPLAY_NAME_FALLBACK,
} from "./domain/display-name";
export {
  authErrorMessage,
  passwordUpdateErrorMessage,
  AUTH_GENERIC_CREDENTIAL_MESSAGE,
  PASSWORD_RESET_LINK_EXPIRED_MESSAGE,
} from "./domain/auth-error";
export { untrustedTextRule } from "./domain/untrusted-text";
export {
  buildDuckLinePrompt,
  parseDuckLine,
  DUCK_LINE_MOODS,
  DUCK_LINE_MAX_CHARS,
  type DuckLineFacts,
  type DuckLineMood,
  type DuckLineResult,
} from "./domain/duck-line-prompt";
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

// 2026-07-29 : 메신저 - 검색 하이라이트 (Phase 51 T3 잔여)
export { splitByQuery, type HighlightPart } from "./domain/search-highlight";
export { kstDayRange, type MessageSearchFilter } from "./domain/search-filter";
export { detectSensitiveInfo } from "./domain/sensitive-info";
export {
  STORAGE_FREE_TIER_BYTES,
  formatBytes,
  storageUsagePercent,
} from "./domain/storage-usage";

// 2026-07-29 : 메신저 - URL 링크화 (Phase 54)
export { linkifyParts, type LinkPart,
  pageIdFromHref,
  collectPageIds,
} from "./domain/linkify";

// 2026-07-29 : 메신저 - 코드 블록 분리 (Phase 54 T3)
export { codeFenceParts, type CodeFencePart } from "./domain/code-fence";

// 2026-07-29 : 메신저 - 링크 모아보기 (Phase 55 T3 K-016)
export { extractLinks, type CollectedLink } from "./domain/link-collection";

// 2026-07-29 : 메신저 - 슬래시 커맨드 (Phase 52 T2)
export {
  SLASH_COMMANDS,
  matchSlashCommands,
  parseSlashCommand,
  slashReceiptText,
  type SlashCommand,
  type SlashParse,
} from "./domain/slash-command";

// 2026-07-27 : 메신저 - 이미지 첨부 규칙 (Phase 50 T4)
export {
  MESSAGE_IMAGE_TYPES,
  MESSAGE_IMAGE_MAX_BYTES,
  MESSAGE_IMAGE_MAX_EDGE,
  checkMessageImage,
  resizeTarget,
  messageAttachmentPath,
  type AttachmentCheck,
} from "./domain/attachment-rules";

// 2026-07-27 : 메신저 - 읽음 보내기 판정 (Phase 51 T1)
export {
  READ_RECEIPT_MIN_INTERVAL_MS,
  shouldSendRead,
  shouldFlushOnLeave,
  afterSend,
  type ReadReceiptState,
} from "./domain/read-receipt";

// 2026-07-27 : 메신저 - 메시지 반응 (Phase 51)
export {
  REACTION_EMOJIS,
  summarizeReactions,
  shouldRemoveReaction,
  type Reaction,
  type ReactionEmoji,
  type ReactionSummary,
} from "./domain/reaction";
