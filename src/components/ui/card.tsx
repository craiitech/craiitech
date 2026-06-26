import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  // Detect if the card is a "plain" institutional card that needs visual emphasis.
  // We exclude cards that already have strong semantic backgrounds (red for alerts, etc.)
  const isSimple = !className || 
                   (!className.includes('bg-destructive') && !className.includes('bg-emerald') && !className.includes('bg-rose') && !className.includes('bg-amber')) ||
                   className.includes('bg-white') ||
                   className.includes('bg-card') ||
                   className.includes('bg-background') ||
                   className.includes('border-primary/10') ||
                   className.includes('shadow-md');

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-[2.5rem] border border-white/40 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-card-foreground shadow-[0_20px_50px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out hover:-translate-y-2",
        className
      )}
      {...props}
    >
      {isSimple && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Primary Institutional Blob */}
          <div className="absolute -top-[20%] -left-[10%] w-72 h-72 bg-primary/15 rounded-full blur-[80px] animate-float-blob" />
          
          {/* Accent Institutional Blob */}
          <div className="absolute -bottom-[20%] -right-[10%] w-72 h-72 bg-accent/10 rounded-full blur-[80px] animate-float-blob" style={{ animationDelay: '4s' }} />
          
          {/* Secondary Soft Blob for depth */}
          <div className="absolute top-[20%] right-[10%] w-40 h-40 bg-primary/5 rounded-full blur-[60px] animate-float-blob" style={{ animationDelay: '2s' }} />
        </div>
      )}
      {props.children}
    </div>
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative z-10 flex flex-col space-y-1.5 p-8", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100 uppercase",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("relative z-10 p-8 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative z-10 flex items-center p-8 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }