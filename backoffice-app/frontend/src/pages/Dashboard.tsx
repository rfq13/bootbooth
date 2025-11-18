import './Dashboard.css'

export default function Dashboard() {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h2>Welcome Back, Mahfuzul!</h2>
          <p>Here's what happening with your store today</p>
        </div>
      <div className="main-summary">
        <div className="summary-chart-container">
          <div className="summary-chart">
            <div className="chart-header">
              <h3>Summary</h3>
              <div className="chart-legend">
                <span>Order</span>
                <span>Income Growth</span>
              </div>
              <select>
                <option>Last 7 days</option>
              </select>
            </div>
            {/* Chart will be implemented here */}
          </div>
          <div className="recent-orders">
            <div className="recent-orders-header">
              <h3>Recent Orders</h3>
              <a href="#">View All</a>
            </div>
            {/* Recent orders table will be implemented here */}
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Water Bottle</td>
                  <td>Peterson Jack</td>
                  <td>#8441573</td>
                  <td>27 Jun 2025</td>
                  <td><span className="status-pending">Pending</span></td>
                </tr>
                <tr>
                  <td>iPhone 15 Pro</td>
                  <td>Michel Datta</td>
                  <td>#2457841</td>
                  <td>26 Jun 2025</td>
                  <td><span className="status-canceled">Canceled</span></td>
                </tr>
                <tr>
                  <td>Headphone</td>
                  <td>Jesiyal Rose</td>
                  <td>#1024784</td>
                  <td>20 Jun 2025</td>
                  <td><span className="status-shipped">Shipped</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="side-summary">
          <div className="most-selling-products">
            <h3>Most Selling Products</h3>
            {/* Most selling products list will be implemented here */}
            <ul className="product-list">
              <li>
                <img src="/placeholder.svg" alt="Snicker Vento" />
                <div className="product-info">
                  <span>Snicker Vento</span>
                  <span>ID: 2441310</span>
                </div>
                <span className="sales-count">128 Sales</span>
              </li>
              <li>
                <img src="/placeholder.svg" alt="Blue Backpack" />
                <div className="product-info">
                  <span>Blue Backpack</span>
                  <span>ID: 1241318</span>
                </div>
                <span className="sales-count">401 Sales</span>
              </li>
              <li>
                <img src="/placeholder.svg" alt="Water Bottle" />
                <div className="product-info">
                  <span>Water Bottle</span>
                  <span>ID: 8441573</span>
                </div>
                <span className="sales-count">1K+ Sales</span>
              </li>
            </ul>
          </div>
          <div className="weekly-top-customers">
            <h3>Weekly Top Customers</h3>
            {/* Weekly top customers list will be implemented here */}
            <ul className="customer-list">
              <li>
                <img src="/placeholder.svg" alt="Marks Hoverson" />
                <div className="customer-info">
                  <span>Marks Hoverson</span>
                  <span>25 Orders</span>
                </div>
                <button className="view-button">View</button>
              </li>
              <li>
                <img src="/placeholder.svg" alt="Marks Hoverson" />
                <div className="customer-info">
                  <span>Marks Hoverson</span>
                  <span>15 Orders</span>
                </div>
                <button className="view-button">View</button>
              </li>
              <li>
                <img src="/placeholder.svg" alt="Jhony Peters" />
                <div className="customer-info">
                  <span>Jhony Peters</span>
                  <span>23 Orders</span>
                </div>
                <button className="view-button">View</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
        <div className="header-actions">
          <select>
            <option>Previous Year</option>
          </select>
          <button>View All Time</button>
        </div>
      </header>
      <div className="summary-cards">
        <div className="card">
          <div className="card-title">Ecommerce Revenue</div>
          <div className="card-value">$245,450</div>
          <div className="card-change-positive">▲ 14.9% <span>(+43.21%)</span></div>
        </div>
        <div className="card">
          <div className="card-title">New Customers</div>
          <div className="card-value">684</div>
          <div className="card-change-negative">▼ -8.6%</div>
        </div>
        <div className="card">
          <div className="card-title">Repeat Purchase Rate</div>
          <div className="card-value">75.12 %</div>
          <div className="card-change-positive">▲ 25.4% <span>(+20.11%)</span></div>
        </div>
        <div className="card">
          <div className="card-title">Average Order Value</div>
          <div className="card-value">$2,412.23</div>
          <div className="card-change-positive">▲ 35.2% <span>(+$754)</span></div>
        </div>
        <div className="card">
          <div className="card-title">Conversion rate</div>
          <p className="card-value">32.65 %</p>
          <div className="card-change-negative">▼ 12.42%</div>
        </div>
      </div>
    </div>
  )
}