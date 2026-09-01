import { describe, expect, it } from "vitest";
import { getManualStoryIndex } from "../../lib/stories";

describe("manual story navigation", () => {
  it("moves only after an explicit next or previous action", () => {
    // Given
    const storyCount = 5;

    // When
    const nextIndex = getManualStoryIndex({ currentIndex: 1, direction: "next", storyCount });
    const previousIndex = getManualStoryIndex({ currentIndex: 1, direction: "previous", storyCount });

    // Then
    expect(nextIndex).toBe(2);
    expect(previousIndex).toBe(0);
  });

  it("keeps the first and last story in place at the boundaries", () => {
    // Given
    const storyCount = 5;

    // When
    const beforeFirst = getManualStoryIndex({ currentIndex: 0, direction: "previous", storyCount });
    const afterLast = getManualStoryIndex({ currentIndex: 4, direction: "next", storyCount });

    // Then
    expect(beforeFirst).toBe(0);
    expect(afterLast).toBe(4);
  });
});
