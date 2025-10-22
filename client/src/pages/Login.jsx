import { LoginForm } from "../components/login-form"
import { School } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import img from "../assets/arohan-the-complete-school-1493272603-1.jpg"

function Login() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-medium">
            <div className="bg-blue-600 text-white flex size-8 items-center justify-center rounded-md">
              <School className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Arohan Pubblic School</h2>
              <p className="text-xs text-muted-foreground">Management System</p>
            </div>
          </div>
          <AnimatedThemeToggler className="p-2 rounded-md hover:bg-accent" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src={img}
          alt="Arohan School"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}

export default Login