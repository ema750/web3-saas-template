require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 100 }));

const users = new Map();
const subscriptions = new Map();

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/auth/register', (req, res) => {
    const { email, password, wallet } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (users.has(email)) return res.status(409).json({ error: 'Email already registered' });
    const user = { id: uuidv4(), email, wallet: wallet || null, plan: 'free', created: new Date().toISOString() };
    users.set(email, user);
    res.status(201).json({ user: { id: user.id, email: user.email, plan: user.plan } });
});
app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    const user = users.get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ user: { id: user.id, email: user.email, plan: user.plan } });
});
app.get('/api/user/profile', (req, res) => {
    const email = req.headers['x-user-email'];
    const user = users.get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});
app.post('/api/subscriptions', (req, res) => {
    const { email, plan, payment_method } = req.body;
    const user = users.get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const sub = { id: uuidv4(), userId: user.id, plan: plan || 'pro', status: 'active', paymentMethod: payment_method || 'crypto', created: new Date().toISOString() };
    subscriptions.set(sub.id, sub);
    user.plan = sub.plan;
    res.status(201).json({ subscription: sub });
});
app.post('/api/webhooks/paychains', (req, res) => {
    const { event, data } = req.body;
    console.log('PayChains webhook:', event, data);
    res.json({ received: true });
});
app.get('/api/features', (req, res) => {
    const email = req.headers['x-user-email'];
    const user = users.get(email);
    const isPro = user && user.plan === 'pro';
    res.json({ features: { basic: true, advanced: isPro, premium: isPro, apiAccess: isPro }, plan: user ? user.plan : 'anonymous' });
});
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });
app.listen(PORT, () => console.log('Web3 SaaS Template API running on port ' + PORT));
module.exports = app;
