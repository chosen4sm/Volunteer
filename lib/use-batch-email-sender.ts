import { useState } from "react";
import { SendAssignmentEmailParams } from "@/lib/email";

interface BatchEmailResult {
  total: number;
  sent: number;
  failed: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useBatchEmailSender() {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<BatchEmailResult>({
    total: 0,
    sent: 0,
    failed: 0,
  });
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  const sendEmails = async (
    assignments: SendAssignmentEmailParams[],
    batchSize: number = 5,
    delayBetweenBatches: number = 2000
  ) => {
    if (assignments.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    setIsSending(true);
    setProgress({ total: assignments.length, sent: 0, failed: 0 });
    
    const batches = Math.ceil(assignments.length / batchSize);
    setTotalBatches(batches);
    setCurrentBatch(0);

    let totalSent = 0;
    let totalFailed = 0;

    try {
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        setCurrentBatch(batchNumber);

        try {
          const response = await fetch("/api/send-assignment-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignments: batch }),
          });

          if (response.ok) {
            const result = await response.json();
            totalSent += result.successful || 0;
            totalFailed += result.failed || 0;
            
            setProgress({
              total: assignments.length,
              sent: totalSent,
              failed: totalFailed,
            });
          } else {
            totalFailed += batch.length;
            setProgress({
              total: assignments.length,
              sent: totalSent,
              failed: totalFailed,
            });
          }
        } catch (error) {
          console.error("Error sending batch:", error);
          totalFailed += batch.length;
          setProgress({
            total: assignments.length,
            sent: totalSent,
            failed: totalFailed,
          });
        }

        if (i + batchSize < assignments.length) {
          await sleep(delayBetweenBatches);
        }
      }

      return { total: assignments.length, sent: totalSent, failed: totalFailed };
    } finally {
      setIsSending(false);
      setCurrentBatch(0);
    }
  };

  const reset = () => {
    setProgress({ total: 0, sent: 0, failed: 0 });
    setCurrentBatch(0);
    setTotalBatches(0);
    setIsSending(false);
  };

  return {
    isSending,
    progress,
    currentBatch,
    totalBatches,
    sendEmails,
    reset,
  };
}

