import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { Metadata } from "next";
import CredentialsSignInForm from "./credentials-signin-form";
import { auth } from "@/auth";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In",
};

const SingInPage = async (props: {
    searchParams: Promise<{
        callbackUrl: string
    }>
}) => {
    const {callbackUrl} = await props.searchParams;

    const session = await auth();

    if (session) {
        return redirect(callbackUrl || "/");
    }

  return (
    <div className="w-full max-w-md mx-auto mt-20">
      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-center">Prijava</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <CredentialsSignInForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default SingInPage;
