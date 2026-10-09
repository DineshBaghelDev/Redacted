import { SignIn } from "@clerk/nextjs";
import { AuthScreen } from "@/components/room-hub/auth-screen";

export default function SignInPage() {
  return (
    <AuthScreen>
      <SignIn />
    </AuthScreen>
  );
}
