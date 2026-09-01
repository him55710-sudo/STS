import { describe, expect, it } from "vitest";
import { DEMO_CREATORS, DEMO_POSTS } from "../../lib/social-content";

describe("demo social content", () => {
  it("adds a varied creator pool with distinguishable seed metadata", () => {
    // Given
    const creatorIds = DEMO_CREATORS.map((creator) => creator.id);

    // When
    const uniqueCreatorCount = new Set(creatorIds).size;
    const allPostsAreMarkedDemo = DEMO_POSTS.every(
      (post) => post.is_demo === true && post.source === "demo-seed"
    );
    const allCreatorsAreMarkedDemo = DEMO_CREATORS.every(
      (creator) => creator.is_demo === true && creator.source === "demo-seed"
    );

    // Then
    expect(DEMO_CREATORS.length).toBeGreaterThanOrEqual(8);
    expect(uniqueCreatorCount).toBe(DEMO_CREATORS.length);
    expect(DEMO_POSTS.length).toBeGreaterThanOrEqual(8);
    expect(allCreatorsAreMarkedDemo).toBe(true);
    expect(allPostsAreMarkedDemo).toBe(true);
  });
});
