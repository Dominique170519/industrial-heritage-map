import fs from "fs";

const AMAP_KEY = "c84a3c9428419973263fae4cfaee0312";

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

// 从高德POI获取图片
async function getAmapImage(name: string, city: string): Promise<string | null> {
  try {
    const url = `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}&citylimit=true&offset=1&page=1&types=&output=json`;

    const res = await fetch(url);
    const data = await res.json() as {
      status: string;
      pois?: {
        photos: { url: string }[];
      }[];
    };

    if (data.status === "1" && data.pois && data.pois.length > 0) {
      const poi = data.pois[0];
      if (poi.photos && poi.photos.length > 0 && poi.photos[0].url) {
        return poi.photos[0].url;
      }
    }
    return null;
  } catch (e) {
    console.error(`Error:`, e);
    return null;
  }
}

async function main() {
  const dataPath = "data/sites.json";
  const sites: Site[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  console.log(`Loaded ${sites.length} sites`);

  let success = 0;
  let failed = 0;

  // 处理全部
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];

    // 简化名称
    const searchName = site.name.replace(/旧址|遗址|公园|厂|矿|站|旧|区/g, '').trim();

    console.log(`Fetching: ${searchName} (${site.city})`);

    const imageUrl = await getAmapImage(searchName, site.city);
    await new Promise(r => setTimeout(r, 300));

    if (imageUrl) {
      site.images = [{ url: imageUrl, alt: `${site.name}图片` }];
      success++;
      console.log(`  ✓ ${imageUrl.substring(0, 80)}...`);
    } else {
      failed++;
      console.log(`  ✗ Not found`);
    }
  }

  console.log(`\nResults: ${success} success, ${failed} failed`);

  // 保存结果
  fs.writeFileSync(dataPath, JSON.stringify(sites, null, 2), "utf-8");
  console.log("Saved!");
}

main().catch(console.error);
