import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        未找到该点位
      </h1>
      <p className="mt-4 text-base leading-8 text-slate-600">
        这个工业遗产点位不存在，或者链接已经失效。
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
      >
        返回首页
      </Link>
    </div>
  );
}
