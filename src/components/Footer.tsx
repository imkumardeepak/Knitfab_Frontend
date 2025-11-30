export default function Footer() {
  return (
    <footer className="border-t-2 bg-background sticky bottom-0 z-10">
      <div className="container mx-auto px-4 py-4">
        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground font-bold">
              &copy; {new Date().getFullYear()} Aarkay Techno Consultants Pvt.
              Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}