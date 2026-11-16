"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import axiosInstance from "@/app/api/axiosInstance";
import ProjectApiList from "@/app/api/ProjectApiList";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Eye, EyeOff } from "lucide-react";

type Props = {
    userId: number;
    open: boolean;
    onOpenChange: () => void;
    onSuccess: () => void;
};

type FormValues = {
    password: string;
    confirmPassword: string;
};

export default function ChangePasswordModal({
    userId,
    open,
    onOpenChange,
    onSuccess,
}: Props) {
    const [showPassword, setShowPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

        
    const {
        register,
        handleSubmit,
        watch,
        formState: {
            errors,
            isSubmitting,
        },
    } = useForm<FormValues>({
        mode: "onChange",
    });

    const password = watch("password");

    const onSubmit = async (
        data: FormValues
    ) => {
        if (
            data.password !==
            data.confirmPassword
        ) {
            toast.error(
                "Passwords do not match"
            );
            return;
        }

        try {
            await axiosInstance.post(
                `${ProjectApiList.update_user_password}/${userId}`,
                {
                    password: data.password,
                }
            );

            toast.success(
                "Password updated successfully"
            );

            onOpenChange();
            onSuccess();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                "Failed to update password"
            );
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Change Password
                    </DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div>
                        <label>
                            New Password
                        </label>

                        <div className="relative">
                            <input
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                {...register(
                                    "password",
                                    {
                                        required:
                                            "Password is required",
                                        minLength: {
                                            value: 6,
                                            message:
                                                "Minimum 6 characters",
                                        },
                                    }
                                )}
                                className="w-full border rounded-lg px-3 py-2 pr-10"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                                className="absolute right-3 top-3"
                            >
                                {showPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>

                        {errors.password && (
                            <p className="text-red-500 text-xs">
                                {
                                    errors.password
                                        .message
                                }
                            </p>
                        )}
                    </div>

                    <div>
                        <label>
                            Confirm Password
                        </label>

                        <div className="relative">
                            <input
                                type={
                                    showConfirmPassword
                                        ? "text"
                                        : "password"
                                }
                                {...register(
                                    "confirmPassword",
                                    {
                                        required:
                                            "Confirm Password is required",
                                        validate:
                                            (value) =>
                                                value ===
                                                password ||
                                                "Passwords do not match",
                                    }
                                )}
                                className="w-full border rounded-lg px-3 py-2 pr-10"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowConfirmPassword(
                                        !showConfirmPassword
                                    )
                                }
                                className="absolute right-3 top-3"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>

                        {errors.confirmPassword && (
                            <p className="text-red-500 text-xs">
                                {
                                    errors
                                        .confirmPassword
                                        .message
                                }
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onOpenChange}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                isSubmitting
                            }
                        >
                            {isSubmitting
                                ? "Updating..."
                                : "Update Password"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}