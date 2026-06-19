import { getOrCreateAgent } from '@/lib/actions/agent'
import { updateAgentProfile } from '@/lib/actions/settings'
import { UserCircle, Shield, Bell, CreditCard } from 'lucide-react'

export default async function SettingsPage() {
  const agent = await getOrCreateAgent()
  if (!agent) return null

  return (
    <div className="p-8 max-w-3xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your Vaultis account and professional details
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <UserCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Profile</h2>
            <p className="text-slate-500 text-xs">Your name and contact details</p>
          </div>
        </div>

        <form action={updateAgentProfile} className="p-6 space-y-5">

          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                name="name"
                type="text"
                required
                defaultValue={agent.name}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Phone Number
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={agent.phone ?? ''}
                placeholder="9876543210"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Email — read only, managed by Clerk */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Email Address
            </label>
            <input
              type="email"
              value={agent.email}
              disabled
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 text-sm cursor-not-allowed"
            />
            <p className="text-slate-600 text-xs">
              Email is managed by your login account and cannot be changed here
            </p>
          </div>

          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            Save Profile
          </button>

        </form>
      </div>

      {/* Professional Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-green-500/10 p-2 rounded-lg">
            <Shield className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">
              Professional Details
            </h2>
            <p className="text-slate-500 text-xs">
              IRDAI license and tax information
            </p>
          </div>
        </div>

        <form action={updateAgentProfile} className="p-6 space-y-5">

          {/* Hidden fields to preserve other values */}
          <input type="hidden" name="name" value={agent.name} />
          <input type="hidden" name="phone" value={agent.phone ?? ''} />

          {/* IRDAI Code */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              IRDAI License / Agent Code
            </label>
            <input
              name="irdaiCode"
              type="text"
              defaultValue={agent.irdaiCode ?? ''}
              placeholder="e.g. 12345678"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
            <p className="text-slate-600 text-xs">
              Your IRDAI agent code from your license certificate
            </p>
          </div>

          {/* GSTIN */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              GSTIN
              <span className="text-slate-500 font-normal ml-1">
                (if registered for GST)
              </span>
            </label>
            <input
              name="gstin"
              type="text"
              defaultValue={agent.gstin ?? ''}
              placeholder="e.g. 27AABCU9603R1ZX"
              maxLength={15}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono uppercase"
            />
            <p className="text-slate-600 text-xs">
              Required for GST invoicing on broker commissions above ₹20L/year
            </p>
          </div>

          {/* Plan info */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-white text-sm font-medium capitalize">
                {agent.plan} Plan
              </div>
              <div className="text-slate-500 text-xs mt-0.5">
                {agent.plan === 'free'
                  ? 'You are on the free plan'
                  : 'Active subscription'}
              </div>
            </div>
            {agent.plan === 'free' && (
              <span className="bg-blue-500/10 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-500/20">
                Upgrade coming soon
              </span>
            )}
          </div>

          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            Save Details
          </button>

        </form>
      </div>

      {/* Notifications — placeholder for Week 6 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden opacity-60">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-lg">
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Notifications</h2>
            <p className="text-slate-500 text-xs">
              WhatsApp and email reminder settings
            </p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm">
            Notification settings will be available when WhatsApp integration
            is live in Week 6.
          </p>
        </div>
      </div>

      {/* Billing — placeholder */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden opacity-60">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-purple-500/10 p-2 rounded-lg">
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Billing</h2>
            <p className="text-slate-500 text-xs">
              Subscription and payment details
            </p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm">
            Billing and subscription management coming in Week 6.
          </p>
        </div>
      </div>

      {/* Account info footer */}
      <div className="text-center">
        <p className="text-slate-700 text-xs">
          Account created {new Date(agent.createdAt!).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
          })}
          {' · '}
          Plan: <span className="capitalize">{agent.plan}</span>
        </p>
      </div>

    </div>
  )
}