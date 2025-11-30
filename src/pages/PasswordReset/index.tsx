import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle, Mail, CheckCircle } from 'lucide-react';
import { authApi, apiUtils } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { ResetPasswordRequestDto } from '@/types/api-types';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const resetData: ResetPasswordRequestDto = {
        email: email,
      };

      const response = await authApi.resetPassword(resetData);
      const result = apiUtils.extractData(response);

      const successMsg = 'Password reset instructions have been sent to your email address.';
      setSuccess(successMsg);
      toast.success('Reset Instructions Sent', successMsg);
    } catch (err) {
      const errorMessage = apiUtils.handleError(err);
      setError(errorMessage);
      toast.error('Reset Request Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  return (
    <div className="flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Password Reset Form */}
        <Card className="animate-fade-in-up">
          <CardHeader className="text-center space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <img
                src="/avyaanlogo.png"
                alt="Avyaan Knitfab Logo"
                className="h-16 w-auto border-2 logo-glow"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground font-display">Reset Password</h1>
              </div>
            </div>
            <div className="space-y-2">
              <CardDescription>
                Enter your email address and we'll send you instructions to reset your password
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                      maxLength={255}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending Instructions...
                    </>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Check your email for the reset link. If you don't see it, check your spam
                    folder.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Link>
            </div>

            {!success && (
              <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Sign up here
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;
