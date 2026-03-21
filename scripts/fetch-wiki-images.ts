import fs from "fs";

interface Site {
  id: string;
  name: string;
  province: string;
  city: string;
  district?: string;
  lat: number;
  lng: number;
  category: string;
  status: string;
  era?: string;
  description?: string;
  images: { url: string; alt: string }[];
  level: string;
  batch: string;
}

// 从维基百科获取图片
async function getWikiImage(searchTerm: string): Promise<string | null> {
  try {
    // 搜索维基百科
    const searchUrl = `https://zh.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchTerm)}&limit=1&namespace=0&format=json`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json() as [string, string[], string[], string[]];

    if (!searchData[1] || searchData[1].length === 0) {
      return null;
    }

    const pageTitle = searchData[1][0];

    // 获取页面图片
    const pageUrl = `https://zh.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=500&format=json`;

    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json() as {
      query: {
        pages: Record<string, { thumbnail?: { source: string } }>;
      };
    };

    const pages = pageData.query?.pages;
    if (!pages) return null;

    for (const pageId of Object.keys(pages)) {
      if (pages[pageId].thumbnail?.source) {
        return pages[pageId].thumbnail.source;
      }
    }

    return null;
  } catch (e) {
    console.error(`Error fetching image for ${searchTerm}:`, e);
    return null;
  }
}

async function main() {
  const dataPath = "data/sites.json";
  const sites: Site[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  console.log(`Loaded ${sites.length} sites`);

  let success = 0;
  let failed = 0;

  // 只处理前20个测试
  for (let i = 0; i < Math.min(20, sites.length); i++) {
    const site = sites[i];

    console.log(`Fetching: ${site.name}`);

    // 尝试多种搜索词
    const searchTerms = [
      site.name,
      `${site.name} 工业遗产`,
      `${site.city}${site.name}`,
      site.name.replace(/旧址|遗址|公园|厂|矿|站/g, ''),
    ];

    let imageUrl = null;
    for (const term of searchTerms) {
      imageUrl = await getWikiImage(term);
      if (imageUrl) break;
      await new Promise(r => setTimeout(r, 300));
    }

    if (imageUrl) {
      site.images = [{ url: imageUrl, alt: `${site.name}图片` }];
      success++;
      console.log(`  ✓ ${imageUrl.substring(0, 60)}...`);
    } else {
      failed++;
      console.log(`  ✗ Not found`);
    }

    // 避免请求过快
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nResults: ${success} success, ${failed} failed (tested 20 sites)`);

  // 暂时不保存，仅测试
  // fs.writeFileSync(dataPath, JSON.stringify(sites, null, 2), "utf-8");
}

main().catch(console.error);
