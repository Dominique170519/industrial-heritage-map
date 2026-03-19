export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-stone-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          免责声明
        </h1>

        <div className="mt-6 space-y-5 text-sm leading-8 text-slate-700">
          <p>
            寻厂 · 工业遗产地图是一个用于展示工业遗产基础信息的轻量网站 MVP，
            当前数据来自本地 JSON 示例，并不代表官方名录、法定保护清单或实时开放信息。
          </p>

          <p>
            站内内容仅供研究、学习、城市观察与产品演示使用，不构成出行建议、
            安全承诺、商业导览、遗产认定或任何形式的进入许可。
          </p>

          <p>
            工业遗产场地可能存在封闭管理、产权限制、施工修缮、地形复杂、
            建筑老化、设施坠落、结构损伤等风险。请用户遵守法律法规与场地管理要求，
            不进入未开放区域，不翻越围挡，不进行危险拍摄或探险活动。
          </p>

          <p>
            若未来接入真实数据源，建议补充数据来源说明、更新时间、版权说明、
            联系方式与纠错机制。
          </p>
        </div>
      </div>
    </div>
  );
}
