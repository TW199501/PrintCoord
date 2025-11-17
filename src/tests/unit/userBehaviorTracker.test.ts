import { UserBehaviorTracker } from "@/services/userBehaviorTracker";
import { FieldType } from "@/types";

// 定義更具體的類型來替代 any
interface UserBehaviorTrackerWithPrivate extends UserBehaviorTracker {
  actions: Array<{ action: string; timestamp: Date; data: unknown }>;
  fieldChoices: Array<{
    text: string;
    context: string[];
    suggestedType: FieldType;
    chosenType: FieldType;
    accepted: boolean;
    confidence?: number;
    responseTime?: number;
  }>;
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("UserBehaviorTracker", () => {
  beforeEach(() => {
    // Clear all instances and mocks
    jest.clearAllMocks();
    (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate).actions =
      [];
    (
      UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate
    ).fieldChoices = [];
  });

  describe("initialize", () => {
    it("should load stored data on initialization", () => {
      const mockActions = [
        {
          action: "test_action",
          timestamp: "2024-01-01T00:00:00.000Z",
          data: { test: true },
        },
      ];
      const mockChoices = [
        {
          text: "test text",
          context: ["context1"],
          suggestedType: FieldType.TEXT,
          chosenType: FieldType.TEXT,
          accepted: true,
          confidence: 0.8,
          responseTime: 1000,
        },
      ];

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockActions))
        .mockReturnValueOnce(JSON.stringify(mockChoices));

      UserBehaviorTracker.initialize();

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "tableTemplate_userActions"
      );
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "tableTemplate_fieldChoices"
      );
    });

    it("should handle invalid stored data gracefully", () => {
      localStorageMock.getItem
        .mockReturnValueOnce("invalid json")
        .mockReturnValueOnce("invalid json");

      UserBehaviorTracker.initialize();

      // Should not throw and should initialize empty arrays
      expect(
        (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate)
          .actions
      ).toEqual([]);
      expect(
        (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate)
          .fieldChoices
      ).toEqual([]);
    });
  });

  describe("recordFieldChoice", () => {
    it("should record field choice correctly", () => {
      const text = "test text";
      const context = ["context1", "context2"];
      const suggestedType = FieldType.TEXT;
      const chosenType = FieldType.NUMBER;
      const responseTime = 1500;

      UserBehaviorTracker.recordFieldChoice(
        text,
        context,
        suggestedType,
        chosenType,
        responseTime
      );

      expect(
        (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate)
          .fieldChoices
      ).toHaveLength(1);
      const choice = (
        UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate
      ).fieldChoices[0];
      expect(choice.text).toBe(text);
      expect(choice.context).toEqual(context);
      expect(choice.suggestedType).toBe(suggestedType);
      expect(choice.chosenType).toBe(chosenType);
      expect(choice.accepted).toBe(false);
      expect(choice.responseTime).toBe(responseTime);
    });

    it("should limit field choices to 500 when exceeding 1000", () => {
      // Add 1001 choices
      for (let i = 0; i < 1001; i++) {
        UserBehaviorTracker.recordFieldChoice(
          `text${i}`,
          [],
          FieldType.TEXT,
          FieldType.TEXT
        );
      }

      expect(
        (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate)
          .fieldChoices
      ).toHaveLength(500);
    });

    it("should save data after recording choice", () => {
      UserBehaviorTracker.recordFieldChoice(
        "test",
        [],
        FieldType.TEXT,
        FieldType.TEXT
      );

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(3); // actions, fieldChoices, and smart suggestions data
    });
  });

  describe("recordAction", () => {
    it("should record action correctly", () => {
      const action = "test_action";
      const data: unknown = { key: "value" };

      UserBehaviorTracker.recordAction(action, data);

      expect(
        (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate)
          .actions
      ).toHaveLength(1);
      const recordedAction = (
        UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate
      ).actions[0];
      expect(recordedAction.action).toBe(action);
      expect(recordedAction.data).toBe(data);
      expect(recordedAction.timestamp).toBeInstanceOf(Date);
    });

    it("should limit actions to 1000 when exceeding 2000", () => {
      // Add 2001 actions
      for (let i = 0; i < 2001; i++) {
        UserBehaviorTracker.recordAction(`action${i}`);
      }

      expect(
        (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate)
          .actions
      ).toHaveLength(1000);
    });

    it("should save data after recording action", () => {
      UserBehaviorTracker.recordAction("test");

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe("analyzeBehaviorPatterns", () => {
    it("should return default pattern when no choices exist", () => {
      const pattern = UserBehaviorTracker.analyzeBehaviorPatterns();

      expect(pattern.acceptanceRate).toBe(0);
      expect(pattern.averageResponseTime).toBe(0);
      expect(pattern.commonCorrections).toEqual([]);
      expect(Object.values(pattern.preferredFieldTypes)).toEqual([
        0, 0, 0, 0, 0,
      ]);
    });

    it("should analyze field choice patterns correctly", () => {
      // Add some test data
      UserBehaviorTracker.recordFieldChoice(
        "text1",
        [],
        FieldType.TEXT,
        FieldType.TEXT,
        1000
      );
      UserBehaviorTracker.recordFieldChoice(
        "text2",
        [],
        FieldType.TEXT,
        FieldType.NUMBER,
        2000
      );
      UserBehaviorTracker.recordFieldChoice(
        "text3",
        [],
        FieldType.NUMBER,
        FieldType.NUMBER,
        1500
      );

      const pattern = UserBehaviorTracker.analyzeBehaviorPatterns();

      expect(pattern.acceptanceRate).toBe(2 / 3); // 2 out of 3 were accepted
      expect(pattern.averageResponseTime).toBe(1500); // Average of 1000, 2000, 1500
      expect(pattern.preferredFieldTypes[FieldType.TEXT]).toBe(1 / 3);
      expect(pattern.preferredFieldTypes[FieldType.NUMBER]).toBe(2 / 3);
    });

    it("should identify common corrections", () => {
      UserBehaviorTracker.recordFieldChoice(
        "text1",
        [],
        FieldType.TEXT,
        FieldType.NUMBER
      );
      UserBehaviorTracker.recordFieldChoice(
        "text2",
        [],
        FieldType.TEXT,
        FieldType.NUMBER
      );
      UserBehaviorTracker.recordFieldChoice(
        "text3",
        [],
        FieldType.NUMBER,
        FieldType.TEXT
      );

      const pattern = UserBehaviorTracker.analyzeBehaviorPatterns();

      expect(pattern.commonCorrections).toHaveLength(2);
      expect(pattern.commonCorrections[0].fromType).toBe(FieldType.TEXT);
      expect(pattern.commonCorrections[0].toType).toBe(FieldType.NUMBER);
      expect(pattern.commonCorrections[0].frequency).toBe(2);
    });
  });

  describe("getUserPreferences", () => {
    it("should return default preferences when no stored data", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const prefs = UserBehaviorTracker.getUserPreferences();

      expect(prefs.autoAcceptHighConfidence).toBe(false);
      expect(prefs.showAlternatives).toBe(true);
      expect(prefs.learningEnabled).toBe(true);
    });

    it("should return stored preferences when available", () => {
      const storedPrefs = {
        autoAcceptHighConfidence: true,
        showAlternatives: false,
        learningEnabled: false,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPrefs));

      const prefs = UserBehaviorTracker.getUserPreferences();

      expect(prefs.autoAcceptHighConfidence).toBe(true);
      expect(prefs.showAlternatives).toBe(false);
      expect(prefs.learningEnabled).toBe(false);
    });

    it("should return default preferences when stored data is invalid", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      const prefs = UserBehaviorTracker.getUserPreferences();

      expect(prefs.autoAcceptHighConfidence).toBe(false);
    });
  });

  describe("updateUserPreferences", () => {
    it("should update preferences correctly", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          autoAcceptHighConfidence: false,
          showAlternatives: true,
          learningEnabled: true,
        })
      );

      UserBehaviorTracker.updateUserPreferences({
        autoAcceptHighConfidence: true,
        showAlternatives: false,
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "tableTemplate_userPreferences",
        JSON.stringify({
          autoAcceptHighConfidence: true,
          showAlternatives: false,
          learningEnabled: true,
        })
      );
    });

    it("should handle storage errors gracefully", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      // Should not throw
      expect(() => {
        UserBehaviorTracker.updateUserPreferences({
          autoAcceptHighConfidence: true,
        });
      }).not.toThrow();
    });
  });

  describe("getUsageStats", () => {
    it("should calculate usage statistics correctly", () => {
      // Add some actions including session starts
      UserBehaviorTracker.recordAction("session_start");
      UserBehaviorTracker.recordAction("other_action");
      UserBehaviorTracker.recordAction("session_start");

      // Add some field choices
      UserBehaviorTracker.recordFieldChoice(
        "text",
        [],
        FieldType.TEXT,
        FieldType.TEXT
      );

      const stats = UserBehaviorTracker.getUsageStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.totalFieldChoices).toBe(1);
      expect(stats.mostUsedFieldType).toBe(FieldType.TEXT);
      expect(stats.lastActivity).toBeInstanceOf(Date);
    });

    it("should calculate average session time", () => {
      // Create actions with specific timestamps
      const now = Date.now();
      (
        UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate
      ).actions = [
        { action: "session_start", timestamp: new Date(now), data: null },
        { action: "other_action", timestamp: new Date(now + 5000), data: null }, // 5 seconds later
        {
          action: "another_action",
          timestamp: new Date(now + 10000),
          data: null,
        }, // 10 seconds later
      ];

      const stats = UserBehaviorTracker.getUsageStats();

      expect(stats.averageSessionTime).toBe(5000); // Average of 5000 and 5000 (time between consecutive actions)
    });
  });

  describe("exportBehaviorData", () => {
    it("should export all behavior data", () => {
      UserBehaviorTracker.recordAction("test_action");
      UserBehaviorTracker.recordFieldChoice(
        "test",
        [],
        FieldType.TEXT,
        FieldType.TEXT
      );

      const exportData = UserBehaviorTracker.exportBehaviorData();

      expect(exportData.actions).toHaveLength(1);
      expect(exportData.fieldChoices).toHaveLength(1);
      expect(exportData.patterns).toBeDefined();
      expect(exportData.stats).toBeDefined();
    });
  });

  describe("clearBehaviorData", () => {
    it("should clear all data", () => {
      UserBehaviorTracker.recordAction("test");
      UserBehaviorTracker.recordFieldChoice(
        "test",
        [],
        FieldType.TEXT,
        FieldType.TEXT
      );

      UserBehaviorTracker.clearBehaviorData();

      expect(
        (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate)
          .actions
      ).toEqual([]);
      expect(
        (UserBehaviorTracker as unknown as UserBehaviorTrackerWithPrivate)
          .fieldChoices
      ).toEqual([]);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(4); // from recordAction, recordFieldChoice, and clearBehaviorData
    });
  });
});
