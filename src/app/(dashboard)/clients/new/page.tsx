import { addClient } from '@/lib/actions/clients'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewClientPage() {
  return (
    <div className="p-8 max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/clients"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <h1 className="text-2xl font-bold text-white">Add New Client</h1>
        <p className="text-slate-400 text-sm mt-1">
          Add a client to start managing their insurance policies
        </p>
      </div>

      {/* Form */}
      <form action={addClient} className="space-y-5">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">

          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
            Basic Information
          </h2>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="Rajesh Kumar"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              name="phone"
              type="tel"
              required
              placeholder="9876543210"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Email Address
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </label>
            <input
              name="email"
              type="email"
              placeholder="rajesh@example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* DOB */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Date of Birth
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </label>
            <input
              name="dob"
              type="date"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Address
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              name="address"
              rows={3}
              placeholder="123, MG Road, Pune, Maharashtra 411001"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            Add Client
          </button>
          <Link
            href="/clients"
            className="px-6 py-3 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </Link>
        </div>

      </form>
    </div>
  )
}