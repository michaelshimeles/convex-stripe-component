import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<"checkout" | "subscriptions" | "customers" | "database">("database");
  const [oneTimePriceId, setOneTimePriceId] = useState("price_1RYvhpGadJM86FzJSoP8lfYO");
  const [subscriptionPriceId, setSubscriptionPriceId] = useState("price_1RnWvAGadJM86FzJYbJrT5M1");
  const [customerId, setCustomerId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [seatCount, setSeatCount] = useState(1);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);

  // Live database data
  const liveData = useQuery(api.stripe.getLiveData);

  // Actions
  const createSubscriptionCheckout = useAction(api.stripe.createSubscriptionCheckout);
  const createPaymentCheckout = useAction(api.stripe.createPaymentCheckout);
  const updateSeats = useAction(api.stripe.updateSeats);
  const cancelSubscription = useAction(api.stripe.cancelSubscription);
  const getPortalUrl = useAction(api.stripe.getCustomerPortalUrl);

  // Queries
  const subscriptionInfo = useQuery(
    api.stripe.getSubscriptionInfo,
    subscriptionId ? { subscriptionId } : "skip"
  );
  const customerData = useQuery(
    api.stripe.getCustomerData,
    customerId ? { customerId } : "skip"
  );

  // Mutations
  const linkToOrg = useMutation(api.stripe.linkSubscriptionToOrg);

  const handleCreateSubscription = async () => {
    try {
      const result = await createSubscriptionCheckout({ priceId: subscriptionPriceId, customerId: customerId || undefined });
      setCheckoutResult(result);
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleCreatePayment = async () => {
    try {
      const result = await createPaymentCheckout({ priceId: oneTimePriceId });
      setCheckoutResult(result);
    } catch (error) {
      console.error("Error creating payment:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleUpdateSeats = async () => {
    try {
      await updateSeats({ subscriptionId, seatCount });
      alert("Seats updated successfully!");
    } catch (error) {
      console.error("Error updating seats:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleCancelSubscription = async (immediately: boolean) => {
    try {
      await cancelSubscription({ subscriptionId, immediately });
      alert(`Subscription ${immediately ? 'canceled immediately' : 'will cancel at period end'}!`);
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleGetPortalUrl = async () => {
    try {
      const result = await getPortalUrl({ customerId });
      if (result?.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      console.error("Error getting portal URL:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  const handleLinkToOrg = async () => {
    try {
      await linkToOrg({
        subscriptionId,
        orgId: "org_demo_123",
        userId: "user_demo_456"
      });
      alert("Subscription linked to org!");
    } catch (error) {
      console.error("Error linking subscription:", error);
      alert("Error: " + (error as Error).message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Stripe Component Demo</h1>
        <p>Test all Stripe integration features with live database updates</p>
      </header>

      <div className="tabs">
        <button
          className={activeTab === "database" ? "active" : ""}
          onClick={() => setActiveTab("database")}
        >
          Live Database
        </button>
        <button
          className={activeTab === "checkout" ? "active" : ""}
          onClick={() => setActiveTab("checkout")}
        >
          Checkout
        </button>
        <button
          className={activeTab === "subscriptions" ? "active" : ""}
          onClick={() => setActiveTab("subscriptions")}
        >
          Subscriptions
        </button>
        <button
          className={activeTab === "customers" ? "active" : ""}
          onClick={() => setActiveTab("customers")}
        >
          Customers
        </button>
      </div>

      <div className="content">
        {activeTab === "database" && (
          <div className="section">
            <h2>Live Database View</h2>
            <p className="subtitle">Real-time data from your Stripe component • Updates automatically</p>

            {liveData && (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{liveData.stats.totalCustomers}</div>
                    <div className="stat-label">Total Customers</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{liveData.stats.activeSubscriptions}</div>
                    <div className="stat-label">Active Subscriptions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{liveData.stats.totalSubscriptions}</div>
                    <div className="stat-label">Total Subscriptions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{liveData.stats.paidInvoices}/{liveData.stats.totalInvoices}</div>
                    <div className="stat-label">Paid Invoices</div>
                  </div>
                </div>

                <div className="database-section">
                  <h3>Customers ({liveData.customers.length})</h3>
                  {liveData.customers.length > 0 ? (
                    <div className="data-table">
                      {liveData.customers.map((customer: any) => (
                        <div key={customer._id} className="data-row">
                          <div className="data-main">
                            <strong>{customer.email || customer.name || "No name"}</strong>
                            <code className="data-id">{customer.stripeCustomerId}</code>
                          </div>
                          {customer.metadata && (
                            <div className="data-meta">
                              Metadata: {JSON.stringify(customer.metadata)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No customers yet</div>
                  )}
                </div>

                <div className="database-section">
                  <h3>Subscriptions ({liveData.subscriptions.length})</h3>
                  {liveData.subscriptions.length > 0 ? (
                    <div className="data-table">
                      {liveData.subscriptions.map((sub: any) => (
                        <div key={sub._id} className="data-row">
                          <div className="data-main">
                            <span className={`status-badge status-${sub.status}`}>
                              {sub.status}
                            </span>
                            <code className="data-id">{sub.stripeSubscriptionId}</code>
                          </div>
                          <div className="data-details">
                            <span>Customer: {sub.stripeCustomerId}</span>
                            {sub.quantity && <span>• Quantity: {sub.quantity}</span>}
                            {sub.metadata && <span>• Metadata: {JSON.stringify(sub.metadata)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No subscriptions yet</div>
                  )}
                </div>

                <div className="database-section">
                  <h3>Checkout Sessions ({liveData.checkoutSessions.length})</h3>
                  {liveData.checkoutSessions.length > 0 ? (
                    <div className="data-table">
                      {liveData.checkoutSessions.map((session: any) => (
                        <div key={session._id} className="data-row">
                          <div className="data-main">
                            <span className={`status-badge status-${session.status}`}>
                              {session.status}
                            </span>
                            <code className="data-id">{session.stripeCheckoutSessionId}</code>
                          </div>
                          <div className="data-details">
                            <span>Mode: {session.mode}</span>
                            {session.stripeCustomerId && <span>• Customer: {session.stripeCustomerId}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No checkout sessions yet</div>
                  )}
                </div>

                <div className="database-section">
                  <h3>One-Time Payments ({liveData.payments.length})</h3>
                  {liveData.payments.length > 0 ? (
                    <div className="data-table">
                      {liveData.payments.map((payment: any) => (
                        <div key={payment._id} className="data-row">
                          <div className="data-main">
                            <span className={`status-badge status-${payment.status}`}>
                              {payment.status}
                            </span>
                            <code className="data-id">{payment.stripePaymentIntentId}</code>
                          </div>
                          <div className="data-details">
                            <span>Customer: {payment.stripeCustomerId || 'Guest'}</span>
                            <span>• Amount: ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}</span>
                            {payment.orgId && <span>• Org: {payment.orgId}</span>}
                            {payment.userId && <span>• User: {payment.userId}</span>}
                          </div>
                          {payment.metadata && Object.keys(payment.metadata).length > 0 && (
                            <div className="data-meta">
                              Metadata: {JSON.stringify(payment.metadata)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No payments yet</div>
                  )}
                </div>

                <div className="database-section">
                  <h3>Invoices ({liveData.invoices.length})</h3>
                  {liveData.invoices.length > 0 ? (
                    <div className="data-table">
                      {liveData.invoices.map((invoice: any) => (
                        <div key={invoice._id} className="data-row">
                          <div className="data-main">
                            <span className={`status-badge status-${invoice.status}`}>
                              {invoice.status}
                            </span>
                            <code className="data-id">{invoice.stripeInvoiceId}</code>
                          </div>
                          <div className="data-details">
                            <span>Due: ${(invoice.amountDue / 100).toFixed(2)}</span>
                            <span>• Paid: ${(invoice.amountPaid / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No invoices yet</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "checkout" && (
          <div className="section">
            <h2>Create Checkout Sessions</h2>

            <div className="card">
              <h3>Subscription Checkout</h3>
              <div className="form-group">
                <label>Price ID:</label>
                <input
                  type="text"
                  value={subscriptionPriceId}
                  onChange={(e) => setSubscriptionPriceId(e.target.value)}
                  placeholder="price_1RnWvAGadJM86FzJYbJrT5M1"
                />
              </div>
              <div className="form-group">
                <label>Customer ID (optional):</label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="cus_1234567890"
                />
              </div>
              <button onClick={handleCreateSubscription} className="btn-primary">
                Create Subscription Checkout
              </button>
            </div>

            <div className="card">
              <h3>One-Time Payment</h3>
              <div className="form-group">
                <label>Price ID:</label>
                <input
                  type="text"
                  value={oneTimePriceId}
                  onChange={(e) => setOneTimePriceId(e.target.value)}
                  placeholder=""
                />
              </div>
              <button onClick={handleCreatePayment} className="btn-primary">
                Create Payment Checkout
              </button>
            </div>

            {checkoutResult && (
              <div className="card result">
                <h3>Checkout Session Created</h3>
                <div className="result-data">
                  <p><strong>Session ID:</strong> {checkoutResult.sessionId}</p>
                  {checkoutResult.url && (
                    <div>
                      <p><strong>Checkout URL:</strong></p>
                      <a href={checkoutResult.url} target="_blank" rel="noopener noreferrer">
                        Open Checkout →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="section">
            <h2>Manage Subscriptions</h2>

            <div className="card">
              <h3>Get Subscription Info</h3>
              <div className="form-group">
                <label>Subscription ID:</label>
                <input
                  type="text"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                  placeholder="sub_1234567890"
                />
              </div>
              {subscriptionInfo && (
                <div className="result-data">
                  <h4>Subscription Details:</h4>
                  <pre>{JSON.stringify(subscriptionInfo, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="card">
              <h3>Update Seats (Seat-Based Pricing)</h3>
              <div className="form-group">
                <label>Subscription ID:</label>
                <input
                  type="text"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                  placeholder="sub_1234567890"
                />
              </div>
              <div className="form-group">
                <label>Seat Count:</label>
                <input
                  type="number"
                  value={seatCount}
                  onChange={(e) => setSeatCount(Number(e.target.value))}
                  min="1"
                />
              </div>
              <button onClick={handleUpdateSeats} className="btn-primary">
                Update Seats
              </button>
            </div>

            <div className="card">
              <h3>Link Subscription to Org</h3>
              <div className="form-group">
                <label>Subscription ID:</label>
                <input
                  type="text"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                  placeholder="sub_1234567890"
                />
              </div>
              <button onClick={handleLinkToOrg} className="btn-secondary">
                Link to Demo Org
              </button>
              <p className="hint">Links to orgId: "org_demo_123"</p>
            </div>

            <div className="card">
              <h3>Cancel Subscription</h3>
              <div className="form-group">
                <label>Subscription ID:</label>
                <input
                  type="text"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                  placeholder="sub_1234567890"
                />
              </div>
              <div className="button-group">
                <button
                  onClick={() => handleCancelSubscription(false)}
                  className="btn-warning"
                >
                  Cancel at Period End
                </button>
                <button
                  onClick={() => handleCancelSubscription(true)}
                  className="btn-danger"
                >
                  Cancel Immediately
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "customers" && (
          <div className="section">
            <h2>Customer Management</h2>

            <div className="card">
              <h3>Get Customer Data</h3>
              <div className="form-group">
                <label>Customer ID:</label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="cus_1234567890"
                />
              </div>
              {customerData && (
                <div className="result-data">
                  <h4>Customer:</h4>
                  {customerData.customer ? (
                    <pre>{JSON.stringify(customerData.customer, null, 2)}</pre>
                  ) : (
                    <p>No customer found</p>
                  )}

                  <h4>Subscriptions ({customerData.subscriptions?.length || 0}):</h4>
                  {customerData.subscriptions && customerData.subscriptions.length > 0 ? (
                    <pre>{JSON.stringify(customerData.subscriptions, null, 2)}</pre>
                  ) : (
                    <p>No subscriptions</p>
                  )}

                  <h4>Invoices ({customerData.invoices?.length || 0}):</h4>
                  {customerData.invoices && customerData.invoices.length > 0 ? (
                    <pre>{JSON.stringify(customerData.invoices, null, 2)}</pre>
                  ) : (
                    <p>No invoices</p>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Customer Portal</h3>
              <div className="form-group">
                <label>Customer ID:</label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="cus_1234567890"
                />
              </div>
              <button onClick={handleGetPortalUrl} className="btn-primary">
                Open Customer Portal
              </button>
              <p className="hint">Opens Stripe's hosted portal for subscription management</p>
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>
          Tip: Set <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_WEBHOOK_SECRET</code> in your Convex environment
        </p>
      </footer>
    </div>
  );
}

export default App;
