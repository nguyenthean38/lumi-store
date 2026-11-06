import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useFetch';

export default function NotFound({ title = 'Không tìm thấy trang', description = 'Trang bạn tìm có thể đã bị xoá hoặc đường dẫn không đúng.', action }) {
  useDocumentTitle(title);
  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <p className="bg-gradient-to-br from-brand-500 to-violet-500 bg-clip-text text-8xl font-extrabold text-transparent">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-slate-500">{description}</p>
      <div className="mt-6 flex gap-3">
        {action || (
          <>
            <Link to="/"><Button>Về trang chủ</Button></Link>
            <Link to="/products"><Button variant="secondary">Xem sản phẩm</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
