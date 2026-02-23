import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { useSession } from 'next-auth/react';

export default function OrdersPage() {
  const [filter, setFilter] = useState<'all' | 'open' | 'filled' | 'cancelled'>('all');
  const { data: session, status } = useSession();
  const storeUser = useStore((state) => state.user);

  // Use session user if authenticated, otherwise fall back to store user
  const user = session?.user ? {
    id: session.user.id,
    username: session.user.username || 'User',
    balance: session.user.balance || 0,
  } : storeUser;
  const orders = useStore((state) => state.getUserOrders());
  const markets = useStore((state) => state.markets);
  const cancelOrder = useStore((state) => state.cancelOrder);

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getMarket = (marketId: string) => {
    return markets.find((m) => m.id === marketId);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      cancelOrder(orderId);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-blue-500/20 text-blue-400',
      filled: 'bg-emerald-500/20 text-emerald-400',
      partial: 'bg-yellow-500/20 text-yellow-400',
      cancelled: 'bg-slate-500/20 text-slate-400',
    };
    return styles[status] || styles.open;
  };

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return (
      <div className="text-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-foremark-green border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-4">Please log in</h2>
        <p className="text-slate-400">You need to be logged in to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Orders</h1>
        <p className="text-slate-400">View and manage your orders</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {(['all', 'open', 'filled', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-5 py-3 font-medium">Market</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Side</th>
                  <th className="px-5 py-3 font-medium text-right">Price</th>
                  <th className="px-5 py-3 font-medium text-right">Quantity</th>
                  <th className="px-5 py-3 font-medium text-right">Filled</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredOrders.map((order) => {
                  const market = getMarket(order.marketId);
                  if (!market) return null;

                  return (
                    <tr key={order.id} className="hover:bg-slate-700/30">
                      <td className="px-5 py-4">
                        <Link
                          href={`/market/${market.id}`}
                          className="text-white hover:text-primary-400 font-medium line-clamp-1"
                        >
                          {market.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-300 capitalize">{order.type}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            order.side === 'yes'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {order.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-white">{order.price}¢</td>
                      <td className="px-5 py-4 text-right text-white">{order.quantity}</td>
                      <td className="px-5 py-4 text-right text-white">{order.filledQuantity}</td>
                      <td className="px-5 py-4 text-right text-white">
                        {formatCurrency(order.price * order.quantity)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {order.status === 'open' && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-rose-400 hover:text-rose-300 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-white mb-2">No orders found</h3>
            <p className="text-slate-400 mb-4">
              {filter === 'all'
                ? 'You haven\'t placed any orders yet.'
                : `No ${filter} orders.`}
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Start Betting
            </Link>
          </div>
        )}
      </div>

      {/* Order Types Explanation */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Order Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-white mb-2">Market Orders</h3>
            <p className="text-sm text-slate-400">
              Execute immediately at the best available price. Guaranteed to fill but price may
              vary based on available liquidity.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Limit Orders</h3>
            <p className="text-sm text-slate-400">
              Set your own price and wait for a match. Your order will only execute at your
              specified price or better.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
