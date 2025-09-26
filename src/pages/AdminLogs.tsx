import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { motion } from "framer-motion";

interface SecurityLog {
  id: number;
  type: string;
  message: string;
  metadata: any;
  createdAt: string;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);

  useEffect(() => {
    fetch("/admin/logs")
      .then((res) => res.json())
      .then(setLogs)
      .catch((err) => console.error("Failed to fetch logs", err));
  }, []);

  const typeColors: Record<string, string> = {
    error: "bg-red-500 text-white",
    suspicious: "bg-yellow-500 text-black",
    auth: "bg-blue-500 text-white",
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Security Logs</h1>
      <ScrollArea className="h-[80vh]">
        <div className="space-y-4">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-2xl shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={typeColors[log.type] || "bg-gray-500"}>
                      {log.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium">{log.message}</p>
                  {log.metadata && (
                    <pre className="mt-2 text-sm bg-gray-100 p-2 rounded-lg overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
