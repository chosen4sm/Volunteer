"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

interface EmailProgressDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  sent: number;
  failed: number;
  isComplete: boolean;
  currentBatch?: number;
  totalBatches?: number;
  onGenerateWhatsApp?: () => void;
  showWhatsAppOption?: boolean;
}

export function EmailProgressDialog({
  open,
  onClose,
  total,
  sent,
  failed,
  isComplete,
  currentBatch,
  totalBatches,
  onGenerateWhatsApp,
  showWhatsAppOption,
}: EmailProgressDialogProps) {
  const progress = total > 0 ? ((sent + failed) / total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={isComplete ? onClose : undefined}>
      <DialogContent 
        className="sm:max-w-md" 
        onInteractOutside={(e) => !isComplete && e.preventDefault()}
        onEscapeKeyDown={(e) => !isComplete && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isComplete ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                Sending Emails
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 text-primary" />
                Email Sending Complete
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {!isComplete
              ? "Please wait while we send email notifications..."
              : "All emails have been processed"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Progress value={progress} className="h-2" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-muted-foreground">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <div className="text-2xl font-bold text-green-600">{sent}</div>
              </div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4 text-destructive" />
                <div className="text-2xl font-bold text-destructive">{failed}</div>
              </div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>

          {currentBatch !== undefined && totalBatches !== undefined && !isComplete && (
            <div className="space-y-2">
              <div className="text-center text-sm text-muted-foreground">
                Processing batch {currentBatch} of {totalBatches}
              </div>
              {showWhatsAppOption && (
                <div className="text-center text-xs text-muted-foreground/80 flex items-center justify-center gap-1.5">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-green-600" />
                  WhatsApp message will generate after emails complete
                </div>
              )}
            </div>
          )}

          {isComplete && (
            <div className="pt-2">
              {failed === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="text-sm text-green-700 dark:text-green-300">
                    All emails sent successfully!
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg">
                  <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    {sent > 0 ? `${sent} sent successfully, but ${failed} failed to send.` : `All emails failed to send.`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isComplete && (
          <div className="space-y-3">
            {showWhatsAppOption && onGenerateWhatsApp && (
              <Button 
                onClick={() => {
                  onGenerateWhatsApp();
                  onClose();
                }}
                className="w-full"
                variant="default"
              >
                <WhatsAppIcon className="w-4 h-4 mr-2 text-white" />
                Generate WhatsApp Message
              </Button>
            )}
            <Button onClick={onClose} variant={showWhatsAppOption ? "outline" : "default"} className="w-full">
              {showWhatsAppOption ? "Skip & Close" : "Close"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

