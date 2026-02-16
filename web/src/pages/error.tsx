import { AlertCircle, Home, RefreshCw, ArrowLeft, LogIn } from "lucide-react";
import { useNavigate, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/components/user-provider/use-user";

interface ErrorPageProps {
  statusCode?: number;
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
}

export function ErrorPage({
  statusCode,
  title,
  message,
  showHomeButton = true,
  showBackButton = true,
  showRefreshButton = false,
}: ErrorPageProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const isAuthenticated = !!user;

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    if (isAuthenticated) {
      navigate("/overview");
    } else {
      navigate("/login");
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="size-8 text-muted-foreground" />
        </div>

        {statusCode && (
          <div className="text-6xl font-bold text-primary">
            {statusCode}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {title || "Something went wrong"}
          </h1>
          <p className="text-muted-foreground">
            {message || "We're sorry, but something unexpected happened."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {showBackButton && (
            <Button
              variant="outline"
              onClick={handleGoBack}
            >
              <ArrowLeft />
              Go Back
            </Button>
          )}

          {showRefreshButton && (
            <Button
              variant="outline"
              onClick={handleRefresh}
            >
              <RefreshCw />
              Refresh
            </Button>
          )}

          {showHomeButton && (
            <Button onClick={handleGoHome}>
              {isAuthenticated ? (
                <>
                  <Home />
                  Go Home
                </>
              ) : (
                <>
                  <LogIn />
                  Go to Login
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      statusCode={404}
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      showRefreshButton={false}
    />
  );
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      statusCode={500}
      title="Server Error"
      message="We're experiencing technical difficulties. Please try again later."
      showRefreshButton={true}
    />
  );
}

export function ErrorBoundaryPage() {
  const error = useRouteError();
  let statusCode = 500;
  let title = "Something went wrong";
  let message = "We're sorry, but something unexpected happened.";

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    title = error.statusText;
    message = error.data?.message || error.data || message;

    if (statusCode === 404) {
      title = "Page Not Found";
      message = "The page you're looking for doesn't exist or has been moved.";
    }
  } else if (error instanceof Error) {
    title = "Application Error";
    message = error.message;
  }

  return (
    <ErrorPage
      statusCode={statusCode}
      title={title}
      message={message}
      showRefreshButton={statusCode >= 500}
    />
  );
}

export default NotFoundPage;
