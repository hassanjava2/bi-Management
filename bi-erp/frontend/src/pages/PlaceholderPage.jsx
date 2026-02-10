export default function PlaceholderPage({ title = 'الصفحة' }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-gray-600">جاهز لربط المحتوى.</p>
    </div>
  )
}
