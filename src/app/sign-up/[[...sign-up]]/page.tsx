import { SignUp } from "@clerk/nextjs";
import { AuthScreen } from "@/components/room-hub/auth-screen";

export default function SignUpPage() {
  return (
    <AuthScreen>
      <SignUp />
    </AuthScreen>
  );
}
