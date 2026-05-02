import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  // Check if the card has a custom background to decide whether to show the abstract pattern.
  // We exclude common "plain" backgrounds from the custom check.
  const hasCustomBg = className?.includes('bg-') && 
                     !className?.includes('bg-white') && 
                     !className?.includes('bg-card') && 
                     !className?.includes('bg-background') &&
                     !className?.includes('bg-transparent');

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/90 backdrop-blur-xl text-card-foreground shadow-[0_20px_50px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out hover:-translate-y-4",
        className
      )}
      {...props}
    >
      {!hasCustomBg && (
        <>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-float-blob pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl animate-float-blob pointer-events-none" style={{ animationDelay: '3s' }} />
        </>
      )}
      <div className="relative z-10">
        {props.children}
      </div>
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
    className={cn("flex flex-col space-y-1.5 p-8", className)}
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
      "text-2xl font-black leading-tight tracking-tight text-slate-900 uppercase",
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
  <div ref={ref} className={cn("p-8 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-8 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
