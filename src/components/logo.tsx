import Image from 'next/image';

export function Logo({ className, ...props }: { className?: string }) {
  return (
    <Image
      src="/qa_logo.png"
      alt="RSU Quality Assurance Office Logo"
      width={100}
      height={100}
      className={className}
      {...props}
    />
  );
}
