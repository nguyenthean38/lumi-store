import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { Button, EmptyState, ErrorState } from '../../components/ui';
import { ProductGrid } from '../../components/store/ProductCard';

export default function Wishlist() {
  useDocumentTitle('Sản phẩm yêu thích');
  const { wishlist } = useAuth();
  const { data, loading, error, reload } = useFetch(() => api.get('/me/wishlist'), []);
  // hide items un-liked on this page right away
  const items = data?.filter((p) => wishlist.has(p.id));

  return (
    <div className="card p-4">
      <h1 className="mb-4 text-lg font-bold text-slate-900">Sản phẩm yêu thích {items && <span className="text-sm font-medium text-slate-500">({items.length})</span>}</h1>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !loading && !items?.length ? (
        <EmptyState icon={Heart} title="Chưa có sản phẩm yêu thích" description="Bấm vào biểu tượng ♥ trên sản phẩm để lưu lại và mua sau." action={<Link to="/products"><Button>Khám phá sản phẩm</Button></Link>} />
      ) : (
        <ProductGrid products={items} loading={loading} count={4} className="lg:grid-cols-3 xl:grid-cols-4" />
      )}
    </div>
  );
}
