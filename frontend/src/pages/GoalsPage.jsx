import { useState } from 'react'
import { Trophy, Gift, History, Award } from 'lucide-react'
import PointsCard from '../components/goals/PointsCard'
import Leaderboard from '../components/goals/Leaderboard'
import PointsHistory from '../components/goals/PointsHistory'
import BadgesGrid from '../components/goals/BadgesGrid'
import RewardsShop from '../components/goals/RewardsShop'

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: Trophy },
  { id: 'rewards', label: 'المكافآت', icon: Gift },
  { id: 'history', label: 'السجل', icon: History },
  { id: 'badges', label: 'الشارات', icon: Award },
]

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-500" />
          Bi Goals
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          نظام الحوافز والمكافآت
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <PointsCard />
          </div>
          <div className="lg:col-span-2">
            <Leaderboard />
          </div>
        </div>
      )}

      {activeTab === 'rewards' && (
        <RewardsShop />
      )}

      {activeTab === 'history' && (
        <PointsHistory limit={30} />
      )}

      {activeTab === 'badges' && (
        <BadgesGrid />
      )}
    </div>
  )
}
