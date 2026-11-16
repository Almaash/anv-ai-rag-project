"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { changePassword } from "@/app/hrms/api/hrmsApi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/common/ConfirmDialog";

export default function HrmsChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password !== formData.new_password_confirmation) {
      toast.error("New passwords do not match");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleSubmit = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    try {
      await changePassword(formData);
      toast.success("Password changed successfully");
      
      // Clear force change flag in localStorage if it was there
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.requires_password_change = false;
        localStorage.setItem("user", JSON.stringify(user));
      }

      setFormData({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/hrms/dashboard");
      }, 1500);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "Failed to change password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-800"
        >
          <ArrowLeft size={18} />
          Back
        </Button>
      </div>

      <Card className="border-blue-100 shadow-lg">
        <CardHeader className="bg-blue-50/50 border-b border-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-800">
              <KeyRound size={24} />
            </div>
            <div>
              <CardTitle className="text-xl text-blue-900">Change Password</CardTitle>
              <p className="text-sm text-blue-600 mt-1">Update your account security settings</p>
            </div>
          </div>
        </CardHeader>
        
        <form onSubmit={handlePreSubmit}>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current_password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter current password"
                    className="focus-visible:ring-blue-500"
                    value={formData.current_password}
                    onChange={(e) =>
                      setFormData({ ...formData, current_password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div className="grid gap-2">
                <Label htmlFor="new_password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    className="focus-visible:ring-blue-500"
                    value={formData.new_password}
                    onChange={(e) =>
                      setFormData({ ...formData, new_password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new_password_confirmation">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="new_password_confirmation"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="focus-visible:ring-blue-500"
                    value={formData.new_password_confirmation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        new_password_confirmation: e.target.value,
                      })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-gray-50/50 border-t border-gray-100 py-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-blue-800 hover:bg-blue-900 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </CardFooter>
        </form>
      </Card>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirm Password Change"
        message="Are you sure you want to change your password? You will need to use the new password for your next login."
        confirmText="Confirm Change"
        cancelText="Cancel"
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}
