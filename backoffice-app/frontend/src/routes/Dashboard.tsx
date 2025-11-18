import { useEffect, useState } from 'react'
import { connect, type WSMessage } from '../utils/ws'
 
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/table'
import { Badge } from '../components/ui/badge'

export default function Dashboard() {
  const [events, setEvents] = useState<WSMessage[]>([])
  const [realtimeOk, setRealtimeOk] = useState<boolean>(true)
  useEffect(() => {
    try {
      (async () => {
        const mod = await import('gsap');
        const st = await import('gsap/ScrollTrigger');
        const gs = (mod as any).gsap || mod;
        const ScrollTrigger = (st as any).ScrollTrigger || (st as any).default;
        if (gs && ScrollTrigger) {
          (gs as any).registerPlugin(ScrollTrigger);
          const header = document.querySelector<HTMLElement>('header');
          if (header) {
            (gs as any).fromTo(header, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: header, start: 'top 75%', toggleActions: 'play none none reverse' } });
          }
          const grids = Array.from(document.querySelectorAll<HTMLElement>('.grid'));
          grids.forEach(g => { (gs as any).fromTo(g, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: g, start: 'top 50%', toggleActions: 'play none none reverse' } }) });
          const icons = Array.from(document.querySelectorAll<HTMLElement>(".icon-anim"));
          icons.forEach(i => {
            i.addEventListener("mouseenter", () => { (gs as any).to(i, { scale: 1.05, duration: 0.25, ease: "elastic.out(1, 0.6)" }) });
            i.addEventListener("mouseleave", () => { (gs as any).to(i, { scale: 1.0, duration: 0.2, ease: "power2.out" }) });
          });
          const cards = Array.from(document.querySelectorAll<HTMLElement>(".card-anim"));
          cards.forEach(c => {
            c.addEventListener("mouseenter", () => { (gs as any).to(c, { y: -5, duration: 0.2, ease: 'power2.out' }) });
            c.addEventListener("mouseleave", () => { (gs as any).to(c, { y: 0, duration: 0.2, ease: 'power2.out' }) });
          });
        }
      })();
    } catch {}
    let ws: any
    try {
      ws = connect(msg => setEvents(prev => [msg, ...prev].slice(0, 10)))
      setRealtimeOk(true)
    } catch (e) {
      console.error('Dashboard realtime init failed', e)
      setRealtimeOk(false)
    }
    return () => ws.close()
  }, [])
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="reveal">
          <h2 className="text-2xl font-semibold text-gradient">Welcome Back, Mahfuzul!</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Here's what happening with your store today</p>
        </div>
        <div className="flex gap-2">
          <select className="h-9 rounded-md border border-[#e5e7eb] bg-white px-2 text-sm">
            <option>Previous Year</option>
          </select>
          <Button variant="accent">View All Time</Button>
        </div>
      </header>
      {!realtimeOk && <div className="text-sm text-[#dc3545]">Realtime offline: configure VITE_SSE_URL or VITE_WS_URL</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-[#F8E7D6]">
          <div className="text-[#6c757d] text-sm">Ecommerce Revenue</div>
          <div className="text-2xl font-bold">$245,450</div>
          <div className="text-[#22c55e] text-sm">▲ 14.9% <span className="text-[#6c757d]">(+43.21%)</span></div>
        </Card>
        <Card className="bg-[#F0F5F0]">
          <div className="text-[#6c757d] text-sm">New Customers</div>
          <div className="text-2xl font-bold">684</div>
          <div className="text-[#dc3545] text-sm">▼ -8.6%</div>
        </Card>
        <Card className="bg-[#EAEFFB]">
          <div className="text-[#6c757d] text-sm">Repeat Purchase Rate</div>
          <div className="text-2xl font-bold">75.12 %</div>
          <div className="text-[#22c55e] text-sm">▲ 25.4% <span className="text-[#6c757d]">(+20.11%)</span></div>
        </Card>
        <Card className="bg-[#E9F7FF]">
          <div className="text-[#6c757d] text-sm">Average Order Value</div>
          <div className="text-2xl font-bold">$2,412.23</div>
          <div className="text-[#22c55e] text-sm">▲ 35.2% <span className="text-[#6c757d]">(+$754)</span></div>
        </Card>
        <Card className="bg-[#F4E9EC]">
          <div className="text-[#6c757d] text-sm">Conversion rate</div>
          <div className="text-2xl font-bold">32.65 %</div>
          <div className="text-[#dc3545] text-sm">▼ 12.42%</div>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Summary</h3>
              <div className="flex gap-4 text-sm text-[#6c757d]">
                <span>Order</span>
                <span>Income Growth</span>
              </div>
              <select className="h-9 rounded-md border border-[#e5e7eb] bg-white px-2 text-sm">
                <option>Last 7 days</option>
              </select>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Orders</h3>
              <a href="#" className="text-sm">View All</a>
            </div>
            <Table>
              <Thead>
                <Tr>
                  <Th>Product</Th>
                  <Th>Customer</Th>
                  <Th>Order ID</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Water Bottle</Td>
                  <Td>Peterson Jack</Td>
                  <Td>#8441573</Td>
                  <Td>27 Jun 2025</Td>
                  <Td><Badge className="badge-warning">Pending</Badge></Td>
                </Tr>
                <Tr>
                  <Td>iPhone 15 Pro</Td>
                  <Td>Michel Datta</Td>
                  <Td>#2457841</Td>
                  <Td>26 Jun 2025</Td>
                  <Td><Badge className="badge-danger">Canceled</Badge></Td>
                </Tr>
                <Tr>
                  <Td>Headphone</Td>
                  <Td>Jesiyal Rose</Td>
                  <Td>#1024784</Td>
                  <Td>20 Jun 2025</Td>
                  <Td><Badge className="badge-success">Shipped</Badge></Td>
                </Tr>
              </Tbody>
            </Table>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Most Selling Products</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center">
                <img className="w-10 h-10 rounded-md mr-3" src="/placeholder.svg" alt="Snicker Vento" />
                <div className="flex-1">
                  <span className="block font-semibold">Snicker Vento</span>
                  <span className="block text-xs text-[#6c757d]">ID: 2441310</span>
                </div>
                <span className="text-sm font-semibold">128 Sales</span>
              </li>
              <li className="flex items-center">
                <img className="w-10 h-10 rounded-md mr-3" src="/placeholder.svg" alt="Blue Backpack" />
                <div className="flex-1">
                  <span className="block font-semibold">Blue Backpack</span>
                  <span className="block text-xs text-[#6c757d]">ID: 1241318</span>
                </div>
                <span className="text-sm font-semibold">401 Sales</span>
              </li>
              <li className="flex items-center">
                <img className="w-10 h-10 rounded-md mr-3" src="/placeholder.svg" alt="Water Bottle" />
                <div className="flex-1">
                  <span className="block font-semibold">Water Bottle</span>
                  <span className="block text-xs text-[#6c757d]">ID: 8441573</span>
                </div>
                <span className="text-sm font-semibold">1K+ Sales</span>
              </li>
            </ul>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Weekly Top Customers</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center">
                <img className="w-10 h-10 rounded-full mr-3" src="/placeholder.svg" alt="Marks Hoverson" />
                <div className="flex-1">
                  <span className="block font-semibold">Marks Hoverson</span>
                  <span className="block text-xs text-[#6c757d]">25 Orders</span>
                </div>
                <Button variant="default" size="sm">View</Button>
              </li>
              <li className="flex items-center">
                <img className="w-10 h-10 rounded-full mr-3" src="/placeholder.svg" alt="Marks Hoverson" />
                <div className="flex-1">
                  <span className="block font-semibold">Marks Hoverson</span>
                  <span className="block text-xs text-[#6c757d]">15 Orders</span>
                </div>
                <Button variant="default" size="sm">View</Button>
              </li>
              <li className="flex items-center">
                <img className="w-10 h-10 rounded-full mr-3" src="/placeholder.svg" alt="Jhony Peters" />
                <div className="flex-1">
                  <span className="block font-semibold">Jhony Peters</span>
                  <span className="block text-xs text-[#6c757d]">23 Orders</span>
                </div>
                <Button variant="default" size="sm">View</Button>
              </li>
            </ul>
          </Card>
        </div>
      </div>
      <Card style={{ marginTop: 24 }}>
        <h3>Event Terbaru</h3>
        <Table>
          <Thead><Tr><Th>Jenis</Th><Th>Session</Th></Tr></Thead>
          <Tbody>
            {events.map((e, i) => (
              <Tr key={i}><Td>{e.type}</Td><Td>{e.session_id}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  )
}