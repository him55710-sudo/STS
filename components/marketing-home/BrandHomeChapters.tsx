import { HOME_CHAPTERS } from "./BrandHomeData";
import { BrandHomeChapter } from "./BrandHomeChapter";
import { CatalogVisual, CreatorShopVisual, DiscoverVisual, MatchVisual, RevenueVisual, TrackVisual } from "./BrandHomeVisuals";

export function BrandHomeChapters() {
  return (
    <div id="chapters">
      <BrandHomeChapter chapter={HOME_CHAPTERS[0]}><DiscoverVisual /></BrandHomeChapter>
      <BrandHomeChapter chapter={HOME_CHAPTERS[1]}><MatchVisual /></BrandHomeChapter>
      <BrandHomeChapter chapter={HOME_CHAPTERS[2]}><CreatorShopVisual /></BrandHomeChapter>
      <BrandHomeChapter chapter={HOME_CHAPTERS[3]}><TrackVisual /></BrandHomeChapter>
      <BrandHomeChapter chapter={HOME_CHAPTERS[4]}><CatalogVisual /></BrandHomeChapter>
      <BrandHomeChapter chapter={HOME_CHAPTERS[5]}><RevenueVisual /></BrandHomeChapter>
    </div>
  );
}
