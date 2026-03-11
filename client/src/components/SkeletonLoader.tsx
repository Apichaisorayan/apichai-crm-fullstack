import { motion } from "motion/react";
import { Card } from "./ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="h-4 bg-muted rounded w-24 mb-4" />
              <div className="h-8 bg-muted rounded w-32 mb-2" />
              <div className="h-3 bg-muted rounded w-16" />
            </motion.div>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="p-6">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            >
              <div className="h-5 bg-muted rounded w-40 mb-2" />
              <div className="h-4 bg-muted rounded w-48 mb-6" />
              <div className="h-64 bg-muted rounded" />
            </motion.div>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card className="p-6">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        >
          <div className="h-5 bg-muted rounded w-40 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-muted rounded flex-1" />
                <div className="h-4 bg-muted rounded flex-1" />
                <div className="h-4 bg-muted rounded flex-1" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
            ))}
          </div>
        </motion.div>
      </Card>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar Skeleton */}
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex items-center justify-between"
      >
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-muted rounded" />
          <div className="h-9 w-20 bg-muted rounded" />
          <div className="h-5 w-32 bg-muted rounded mt-2 ml-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-40 bg-muted rounded" />
          <div className="h-9 w-32 bg-muted rounded" />
          <div className="h-9 w-32 bg-muted rounded" />
        </div>
      </motion.div>

      {/* Calendar Grid Skeleton */}
      <Card className="p-6">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        >
          <div className="grid grid-cols-7 gap-4 mb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-4 bg-muted rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </motion.div>
      </Card>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <Card className="p-6">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="h-6 bg-muted rounded w-48 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 bg-muted rounded w-12" />
              <div className="h-4 bg-muted rounded flex-1" />
              <div className="h-4 bg-muted rounded flex-1" />
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      </motion.div>
    </Card>
  );
}
