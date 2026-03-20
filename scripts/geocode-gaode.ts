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

// 地理编码请求
async function geocode(
  address: string,
  retries = 2
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=${encodeURIComponent(address.split('市')[0] || '')}`;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const data = await response.json() as {
        status: string;
        geocodes: { location: string }[];
      };

      if (data.status === "1" && data.geocodes && data.geocodes.length > 0) {
        const location = data.geocodes[0].location.split(",");
        if (location.length === 2) {
          return {
            lng: parseFloat(location[0]),
            lat: parseFloat(location[1]),
          };
        }
      }
    } catch (e) {
      console.error(`Geocode error for ${address}:`, e);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return null;
}

async function main() {
  // 读取现有数据
  const dataPath = "data/sites.json";
  const sites: Site[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  console.log(`Loaded ${sites.length} sites`);

  // 找出没有坐标的点位
  const needGeocode = sites.filter(s => !s.lat || !s.lng || s.lat === 0);
  console.log(`Need geocoding: ${needGeocode.length} sites`);

  let success = 0;
  let failed = 0;

  for (const site of needGeocode) {
    // 高德API需要"北京市"格式，加上"市"
    const queryCity = site.city.includes("市") ? site.city : site.city + "市";
    const queryAddress = site.district ? `${queryCity}${site.district}${site.name}` : `${queryCity}${site.name}`;

    console.log(`Geocoding: ${queryAddress}`);

    const coords = await geocode(queryAddress);

    // 添加延迟避免限流
    await new Promise((r) => setTimeout(r, 200));

    if (coords) {
      site.lat = coords.lat;
      site.lng = coords.lng;
      success++;
      console.log(`  ✓ (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    } else {
      failed++;
      console.log(`  ✗ Failed`);
    }
  }

  console.log(`\nResults: ${success} success, ${failed} failed`);

  // 保存结果
  fs.writeFileSync(dataPath, JSON.stringify(sites, null, 2), "utf-8");
  console.log(`Saved to ${dataPath}`);
}

main().catch(console.error);
